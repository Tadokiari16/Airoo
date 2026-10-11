"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { viajesQueUsan } from "@/lib/catalogos";
import { anotar } from "@/lib/bitacora";
import { MODELO_SUGERIDO, VALORES_MODELO, VALORES_TIPO_ALTA } from "@/lib/servicios";
import { usuarioCon } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";
import { serviciosParecidos, type ServicioParecido } from "./datos";

const RUTA = "/servicios";
const SIN_PERMISO = "Tu rol puede consultar servicios, pero no cambiarlos.";

function revalidar(id?: string) {
  revalidatePath(RUTA);
  if (id) revalidatePath(`${RUTA}/${id}`);
}

async function servicio(id: string) {
  const [s] = await db.select().from(schema.servicios).where(eq(schema.servicios.id, id)).limit(1);
  return s ?? null;
}

const tocar = (id: string) =>
  db.update(schema.servicios).set({ actualizadoEn: new Date() }).where(eq(schema.servicios.id, id));

// ─── Alta ────────────────────────────────────────────────────────────────────

export type ResultadoAlta =
  { error: string } | { parecidos: ServicioParecido[] } | { id: string } | undefined;

/** Nombre, tipo y destino. La ficha se abre con el modelo de cobro del tipo. */
export async function crearServicio(_: ResultadoAlta, f: FormData): Promise<ResultadoAlta> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const nombre = limpiar(String(f.get("nombre") ?? ""));
  const destino = limpiar(String(f.get("destino") ?? ""));
  const tipo = z.enum(VALORES_TIPO_ALTA).safeParse(f.get("tipo"));
  if (nombre.length < 2) return { error: "Falta el nombre del servicio." };
  if (!tipo.success) return { error: "Falta elegir el tipo." };
  if (!destino) return { error: "Falta dónde aplica: una ciudad, una región o «Cualquier destino»." };
  if (destino.length > 120) return { error: "El destino lleva hasta 120 caracteres." };

  if (f.get("confirmar") !== "si") {
    const parecidos = await serviciosParecidos(nombre);
    if (parecidos.length > 0) return { parecidos };
  }

  const [nuevo] = await db
    .insert(schema.servicios)
    .values({
      nombre,
      nombreBusqueda: normalizar(nombre),
      tipo: tipo.data,
      destino,
      modeloCobro: MODELO_SUGERIDO[tipo.data],
      creadoPor: yo.id,
    })
    .returning({ id: schema.servicios.id });
  await anotar({
    quien: yo.id,
    texto: `Servicio agregado: ${nombre} (${destino})`,
    entidad: "servicios",
    entidadId: nuevo.id,
  });
  revalidar();
  return { id: nuevo.id };
}

// ─── Ficha ───────────────────────────────────────────────────────────────────

const opcional = (max: number, msg: string) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(max, msg))
    .transform((v) => v || null);

const cuantos = (msg: string) =>
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v === null || v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 99), msg);

const Variante = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(1, "Falta el nombre de un renglón.").max(80)),
  pasajeros: cuantos("Los pasajeros van en números, del 1 al 99."),
  maletas: cuantos("Las maletas van en números, del 1 al 99."),
  detalle: z
    .string()
    .transform((v) => limpiar(v) || null)
    .pipe(z.string().max(200, "El detalle de un renglón lleva hasta 200 caracteres.").nullable()),
});

const Ficha = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre del servicio.")),
  destino: z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(1, "Falta dónde aplica: una ciudad, una región o «Cualquier destino».")
        .max(120, "El destino lleva hasta 120 caracteres."),
    ),
  ciudadId: z
    .string()
    .transform((v) => v || null)
    .pipe(z.uuid("Esa ciudad ya no está en la lista.").nullable()),
  modeloCobro: z.enum(VALORES_MODELO, { error: "Falta elegir cómo se cobra." }),
  notaCobro: opcional(300, "La nota de cómo se cobra lleva hasta 300 caracteres."),
  descripcion: opcional(400, "La descripción lleva hasta 400 caracteres."),
  clienteRecibe: opcional(120, "Lo que recibe el cliente lleva hasta 120 caracteres."),
  enViajeConfirmado: opcional(600, "Lo que ve en el viaje confirmado lleva hasta 600 caracteres."),
  notaInterna: opcional(1000, "La nota lleva hasta 1000 caracteres."),
  variantes: z.array(Variante),
});

export type ResultadoFicha = { error: string } | { guardado: number } | undefined;

export async function guardarFicha(id: string, _: ResultadoFicha, f: FormData): Promise<ResultadoFicha> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const antes = await servicio(id);
  if (!antes) return { error: "Ese servicio ya no existe." };

  let variantes: unknown = [];
  try {
    variantes = JSON.parse(String(f.get("variantes") ?? "[]"));
  } catch {}
  const texto = (k: string) => String(f.get(k) ?? "");
  const p = Ficha.safeParse({
    nombre: texto("nombre"),
    destino: texto("destino"),
    ciudadId: texto("ciudadId"),
    modeloCobro: texto("modeloCobro"),
    notaCobro: texto("notaCobro"),
    descripcion: texto("descripcion"),
    clienteRecibe: texto("clienteRecibe"),
    enViajeConfirmado: texto("enViajeConfirmado"),
    notaInterna: texto("notaInterna"),
    variantes,
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const { variantes: filas, ...d } = p.data;

  if (d.ciudadId && d.ciudadId !== antes.ciudadId) {
    const [ciudad] = await db
      .select({ id: schema.ciudades.id })
      .from(schema.ciudades)
      .where(and(eq(schema.ciudades.id, d.ciudadId), isNull(schema.ciudades.archivadoEn)))
      .limit(1);
    if (!ciudad) return { error: "Esa ciudad ya no está en la lista." };
  }

  // El tipo no cambia después de crear el servicio. Pasajeros y maletas solo
  // tenían sentido en los traslados viejos.
  const traslado = antes.tipo === "traslado";
  await db.transaction(async (tx) => {
    await tx
      .update(schema.servicios)
      .set({ ...d, nombreBusqueda: normalizar(d.nombre), actualizadoEn: new Date() })
      .where(eq(schema.servicios.id, id));
    await tx.delete(schema.servicioVariantes).where(eq(schema.servicioVariantes.servicioId, id));
    if (filas.length)
      await tx.insert(schema.servicioVariantes).values(
        filas.map((v, i) => ({
          ...v,
          pasajeros: traslado ? v.pasajeros : null,
          maletas: traslado ? v.maletas : null,
          servicioId: id,
          orden: i,
        })),
      );
    await anotar(
      {
        quien: yo.id,
        texto: `Ficha de ${d.nombre} guardada`,
        entidad: "servicios",
        entidadId: id,
        antes: { nombre: antes.nombre, tipo: antes.tipo, modeloCobro: antes.modeloCobro },
        despues: { nombre: d.nombre, tipo: antes.tipo, modeloCobro: d.modeloCobro },
      },
      tx,
    );
  });
  revalidar(id);
  return { guardado: Date.now() };
}

// ─── Dónde se puede reservar ─────────────────────────────────────────────────

export async function ligarProveedor(
  servicioId: string,
  proveedorId: string,
): Promise<{ error?: string; mensaje?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const s = await servicio(servicioId);
  if (!s) return { error: "Ese servicio ya no existe." };
  const [p] = await db
    .select()
    .from(schema.proveedores)
    .where(and(eq(schema.proveedores.id, proveedorId), isNull(schema.proveedores.archivadoEn)))
    .limit(1);
  if (!p) return { error: "Ese proveedor ya no está en Proveedores." };
  const [ya] = await db
    .select()
    .from(schema.servicioProveedores)
    .where(
      and(
        eq(schema.servicioProveedores.servicioId, servicioId),
        eq(schema.servicioProveedores.proveedorId, proveedorId),
      ),
    )
    .limit(1);
  if (ya) return { error: `${p.nombre} ya está ligado a este servicio.` };
  await db.transaction(async (tx) => {
    await tx.insert(schema.servicioProveedores).values({ servicioId, proveedorId });
    // Con un proveedor fijo, ya no «varía por reserva».
    await tx
      .update(schema.servicios)
      .set({ variaPorReserva: false, actualizadoEn: new Date() })
      .where(eq(schema.servicios.id, servicioId));
    await anotar(
      {
        quien: yo.id,
        texto: `${p.nombre} ligado a ${s.nombre}`,
        entidad: "servicios",
        entidadId: servicioId,
      },
      tx,
    );
  });
  revalidar(servicioId);
  return { mensaje: `${p.nombre} ligado · sus datos se consultan en Proveedores` };
}

async function liga(id: string) {
  const [l] = await db
    .select({ l: schema.servicioProveedores, proveedor: schema.proveedores.nombre })
    .from(schema.servicioProveedores)
    .innerJoin(schema.proveedores, eq(schema.proveedores.id, schema.servicioProveedores.proveedorId))
    .where(eq(schema.servicioProveedores.id, id))
    .limit(1);
  return l ?? null;
}

export async function quitarLiga(id: string): Promise<{ error?: string; mensaje?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const l = await liga(id);
  if (!l) return {};
  await db.delete(schema.servicioProveedores).where(eq(schema.servicioProveedores.id, id));
  await tocar(l.l.servicioId);
  await anotar({
    quien: yo.id,
    texto: `${l.proveedor} ya no está ligado`,
    entidad: "servicios",
    entidadId: l.l.servicioId,
  });
  revalidar(l.l.servicioId);
  return { mensaje: `${l.proveedor} ya no aparece como opción para este servicio` };
}

/** El ID o código que el servicio tiene en ese proveedor. Opcional. */
export async function guardarIdLiga(id: string, idExterno: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const l = await liga(id);
  if (!l) return { error: "Ese proveedor ya no está ligado." };
  const nuevo = limpiar(idExterno).slice(0, 80) || null;
  if (nuevo === l.l.idExterno) return {};
  await db
    .update(schema.servicioProveedores)
    .set({ idExterno: nuevo })
    .where(eq(schema.servicioProveedores.id, id));
  await tocar(l.l.servicioId);
  await anotar({
    quien: yo.id,
    texto: nuevo ? `ID en ${l.proveedor}: ${nuevo}` : `ID en ${l.proveedor} quitado`,
    entidad: "servicios",
    entidadId: l.l.servicioId,
  });
  revalidar(l.l.servicioId);
  return {};
}

/**
 * «Varía por reserva»: no hay proveedor fijo; se elige en cada cotización
 * entre los de Proveedores. Al encenderlo se quitan los proveedores ligados.
 */
export async function variaPorReserva(servicioId: string, si: boolean): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const s = await servicio(servicioId);
  if (!s) return { error: "Ese servicio ya no existe." };
  if (s.variaPorReserva === si) return {};
  await db.transaction(async (tx) => {
    if (si)
      await tx
        .delete(schema.servicioProveedores)
        .where(eq(schema.servicioProveedores.servicioId, servicioId));
    await tx
      .update(schema.servicios)
      .set({ variaPorReserva: si, actualizadoEn: new Date() })
      .where(eq(schema.servicios.id, servicioId));
    await anotar(
      {
        quien: yo.id,
        texto: si ? "Marcado como «Varía por reserva»" : "Se reserva con proveedores fijos",
        entidad: "servicios",
        entidadId: servicioId,
      },
      tx,
    );
  });
  revalidar(servicioId);
  return {};
}

// ─── Archivar y eliminar ─────────────────────────────────────────────────────

export async function archivarServicio(
  id: string,
  archivar: boolean,
  motivo = "",
): Promise<{ error?: string }> {
  const yo = await usuarioCon("archivar_catalogos");
  if (!yo) return { error: "Tu rol no archiva servicios." };
  const s = await servicio(id);
  if (!s || !!s.archivadoEn === archivar) return {};
  await db
    .update(schema.servicios)
    .set({
      archivadoEn: archivar ? new Date() : null,
      archivadoPor: archivar ? yo.id : null,
      motivoArchivo: archivar ? limpiar(motivo) || null : null,
      actualizadoEn: new Date(),
    })
    .where(eq(schema.servicios.id, id));
  await anotar({
    quien: yo.id,
    texto: archivar
      ? `Servicio archivado: ${s.nombre}${limpiar(motivo) ? ` · ${limpiar(motivo)}` : ""}`
      : `Servicio reactivado: ${s.nombre}`,
    entidad: "servicios",
    entidadId: id,
  });
  revalidar(id);
  return {};
}

/** Viajes que usan el servicio. Las partidas de cotización llegan en la Fase 2. */
const viajesDeServicio = (id: string) => viajesQueUsan("servicioId", id);

export async function eliminarServicio(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("eliminar_catalogos");
  if (!yo) return { error: "Solo el dueño elimina servicios. Se puede archivar." };
  const s = await servicio(id);
  if (!s) return {};
  const viajes = await viajesDeServicio(id);
  if (viajes > 0)
    return {
      error: `Se usó en ${viajes} ${viajes === 1 ? "viaje" : "viajes"}, así que no se puede eliminar; se puede archivar.`,
    };
  await db.transaction(async (tx) => {
    await tx.delete(schema.servicios).where(eq(schema.servicios.id, id));
    await anotar(
      { quien: yo.id, texto: `Servicio eliminado: ${s.nombre}`, entidad: "servicios", entidadId: id },
      tx,
    );
  });
  revalidar();
  return {};
}
