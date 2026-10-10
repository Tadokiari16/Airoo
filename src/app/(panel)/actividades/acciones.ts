"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { viajesQueUsan } from "@/lib/catalogos";
import { anotar } from "@/lib/bitacora";
import {
  CLAVES_BLOQUE,
  COBROS,
  CONFIRMACIONES,
  HORARIOS,
  LLEGADAS,
  SUGERIDOS,
  VALORES_TIPO,
} from "@/lib/actividades";
import { borrarFotos } from "@/lib/imagenes";
import { usuarioCon } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";
import { actividadesParecidas, type ActividadParecida } from "./datos";

const RUTA = "/actividades";
const SIN_PERMISO = "Tu rol puede consultar actividades, pero no cambiarlas.";

function revalidar(id?: string) {
  revalidatePath(RUTA);
  if (id) revalidatePath(`${RUTA}/${id}`);
}

async function actividad(id: string) {
  const [a] = await db.select().from(schema.actividades).where(eq(schema.actividades.id, id)).limit(1);
  return a ?? null;
}

const tocar = (id: string) =>
  db.update(schema.actividades).set({ actualizadoEn: new Date() }).where(eq(schema.actividades.id, id));

const valores = <V extends string>(l: readonly { valor: V }[]) => l.map((x) => x.valor) as [V, ...V[]];

// ─── Alta ────────────────────────────────────────────────────────────────────

export type ResultadoAlta =
  { error: string } | { parecidos: ActividadParecida[] } | { id: string } | undefined;

/** Nombre, ciudad y tipo. La ficha se abre con los bloques sugeridos para el tipo. */
export async function crearActividad(_: ResultadoAlta, f: FormData): Promise<ResultadoAlta> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const nombre = limpiar(String(f.get("nombre") ?? ""));
  const ciudadId = String(f.get("ciudadId") ?? "");
  const tipo = z.enum(VALORES_TIPO).safeParse(f.get("tipo"));
  if (nombre.length < 2) return { error: "Falta el nombre de la actividad." };
  if (!ciudadId) return { error: "Falta elegir la ciudad de la lista." };
  if (!tipo.success) return { error: "Falta elegir el tipo." };
  const [ciudad] = await db
    .select()
    .from(schema.ciudades)
    .where(and(eq(schema.ciudades.id, ciudadId), isNull(schema.ciudades.archivadoEn)))
    .limit(1);
  if (!ciudad) return { error: "Esa ciudad ya no está en la lista." };

  if (f.get("confirmar") !== "si") {
    const parecidos = await actividadesParecidas(nombre);
    if (parecidos.length > 0) return { parecidos };
  }

  const bloques = SUGERIDOS[tipo.data];
  const [nueva] = await db
    .insert(schema.actividades)
    .values({
      nombre,
      nombreBusqueda: normalizar(nombre),
      ciudadId,
      tipo: tipo.data,
      bloques,
      // Puntos de partida comunes; se cambian en la ficha.
      cobro: tipo.data === "parque" ? "edad" : "persona",
      horarioTipo: "abierto",
      creadoPor: yo.id,
    })
    .returning({ id: schema.actividades.id });
  await anotar({
    quien: yo.id,
    texto: `Actividad agregada: ${nombre} (${ciudad.nombre})`,
    entidad: "actividades",
    entidadId: nueva.id,
  });
  revalidar();
  return { id: nueva.id };
}

// ─── Ficha ───────────────────────────────────────────────────────────────────

const opcional = (max: number, msg: string) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(max, msg))
    .transform((v) => v || null);

const enumOpcional = <V extends string>(l: [V, ...V[]]) =>
  z
    .string()
    .transform((v) => v || null)
    .pipe(z.enum(l).nullable());

const edad = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v === null || v === "" ? null : Number(v)))
  .refine(
    (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 99),
    "La edad va en años, del 0 al 99.",
  );

const Plan = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(1, "Falta el nombre de un plan.").max(80)),
  incluye: z
    .string()
    .transform((v) => limpiar(v) || null)
    .pipe(z.string().max(300, "Lo que incluye un plan lleva hasta 300 caracteres.").nullable()),
});

const Boleto = z
  .object({
    nombre: z.string().transform(limpiar).pipe(z.string().min(1, "Falta el nombre de un boleto.").max(60)),
    edadDesde: edad,
    edadHasta: edad,
    gratis: z.boolean(),
  })
  .refine(
    (b) => b.edadDesde === null || b.edadHasta === null || b.edadDesde <= b.edadHasta,
    "En la edad de un boleto, la primera edad va antes que la segunda.",
  );

const Ficha = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre de la actividad.")),
  ciudadId: z.uuid("Falta elegir la ciudad de la lista."),
  tipo: z.enum(VALORES_TIPO, { error: "Falta elegir el tipo." }),
  duracion: opcional(80, "La duración es demasiado larga."),
  descripcion: opcional(400, "La descripción lleva hasta 400 caracteres."),
  bloques: z.array(z.enum(CLAVES_BLOQUE)),
  cobro: enumOpcional(valores(COBROS)),
  maxPersonasGrupo: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => !v || /^\d{1,3}$/.test(v), "El máximo de personas del grupo va en números.")
    .transform((v) => (v ? Number(v) : null)),
  horarioTipo: enumOpcional(valores(HORARIOS)),
  horarioTexto: opcional(200, "El horario es demasiado largo."),
  salidas: z.array(z.string().regex(/^\d{2}:\d{2}$/, "Una hora de salida no tiene un formato válido.")),
  llegada: enumOpcional(valores(LLEGADAS)),
  llegadaTexto: opcional(300, "Cómo llega el cliente lleva hasta 300 caracteres."),
  incluye: opcional(400, "«Incluye» lleva hasta 400 caracteres."),
  noIncluye: opcional(400, "«No incluye» lleva hasta 400 caracteres."),
  queLlevar: opcional(400, "«Qué llevar» lleva hasta 400 caracteres."),
  requisitos: opcional(600, "Los requisitos llevan hasta 600 caracteres."),
  confirmacion: enumOpcional(valores(CONFIRMACIONES)),
  notaInterna: opcional(1000, "La nota lleva hasta 1000 caracteres."),
  planes: z.array(Plan),
  boletos: z.array(Boleto),
});

export type ResultadoFicha = { error: string } | { guardado: number } | undefined;

/**
 * Guarda toda la ficha. Un bloque apagado conserva lo que tenía: si se vuelve
 * a encender, ahí sigue.
 */
export async function guardarFicha(id: string, _: ResultadoFicha, f: FormData): Promise<ResultadoFicha> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const antes = await actividad(id);
  if (!antes) return { error: "Esa actividad ya no existe." };

  const json = (k: string) => {
    try {
      return JSON.parse(String(f.get(k) ?? "[]"));
    } catch {
      return [];
    }
  };
  const texto = (k: string) => String(f.get(k) ?? "");
  const p = Ficha.safeParse({
    nombre: texto("nombre"),
    ciudadId: texto("ciudadId"),
    tipo: texto("tipo"),
    duracion: texto("duracion"),
    descripcion: texto("descripcion"),
    bloques: f.getAll("bloques"),
    cobro: texto("cobro"),
    maxPersonasGrupo: texto("maxPersonasGrupo"),
    horarioTipo: texto("horarioTipo"),
    horarioTexto: texto("horarioTexto"),
    salidas: json("salidas"),
    llegada: texto("llegada"),
    llegadaTexto: texto("llegadaTexto"),
    incluye: texto("incluye"),
    noIncluye: texto("noIncluye"),
    queLlevar: texto("queLlevar"),
    requisitos: texto("requisitos"),
    confirmacion: texto("confirmacion"),
    notaInterna: texto("notaInterna"),
    planes: json("planes"),
    boletos: json("boletos"),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const { planes, boletos, salidas, ...d } = p.data;
  const bloques = CLAVES_BLOQUE.filter((b) => d.bloques.includes(b));
  if (bloques.includes("cobro") && d.cobro === "grupo" && !d.maxPersonasGrupo)
    return { error: "Falta hasta cuántas personas cubre el precio por grupo." };

  const [ciudad] = await db
    .select({ id: schema.ciudades.id })
    .from(schema.ciudades)
    .where(eq(schema.ciudades.id, d.ciudadId))
    .limit(1);
  if (!ciudad) return { error: "Esa ciudad ya no está en la lista." };

  await db.transaction(async (tx) => {
    await tx
      .update(schema.actividades)
      .set({ ...d, bloques, nombreBusqueda: normalizar(d.nombre), actualizadoEn: new Date() })
      .where(eq(schema.actividades.id, id));
    await tx.delete(schema.actividadPlanes).where(eq(schema.actividadPlanes.actividadId, id));
    if (planes.length)
      await tx
        .insert(schema.actividadPlanes)
        .values(planes.map((x, i) => ({ ...x, actividadId: id, orden: i })));
    await tx.delete(schema.actividadBoletos).where(eq(schema.actividadBoletos.actividadId, id));
    if (boletos.length)
      await tx
        .insert(schema.actividadBoletos)
        .values(boletos.map((x, i) => ({ ...x, actividadId: id, orden: i })));
    await tx.delete(schema.actividadSalidas).where(eq(schema.actividadSalidas.actividadId, id));
    const unicas = [...new Set(salidas)].sort();
    if (unicas.length)
      await tx.insert(schema.actividadSalidas).values(unicas.map((hora) => ({ actividadId: id, hora })));
    await anotar(
      {
        quien: yo.id,
        texto: `Ficha de ${d.nombre} guardada`,
        entidad: "actividades",
        entidadId: id,
        antes: { nombre: antes.nombre, tipo: antes.tipo, bloques: antes.bloques },
        despues: { nombre: d.nombre, tipo: d.tipo, bloques },
      },
      tx,
    );
  });
  revalidar(id);
  return { guardado: Date.now() };
}

// ─── Dónde se puede reservar ─────────────────────────────────────────────────

export async function ligarProveedor(
  actividadId: string,
  proveedorId: string,
  idExterno = "",
): Promise<{ error?: string; mensaje?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const a = await actividad(actividadId);
  if (!a) return { error: "Esa actividad ya no existe." };
  const [p] = await db
    .select()
    .from(schema.proveedores)
    .where(and(eq(schema.proveedores.id, proveedorId), isNull(schema.proveedores.archivadoEn)))
    .limit(1);
  if (!p) return { error: "Ese proveedor ya no está en Proveedores." };
  const [ya] = await db
    .select()
    .from(schema.actividadProveedores)
    .where(
      and(
        eq(schema.actividadProveedores.actividadId, actividadId),
        eq(schema.actividadProveedores.proveedorId, proveedorId),
      ),
    )
    .limit(1);
  if (ya) return { error: `${p.nombre} ya está ligado a esta actividad.` };
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.actividadProveedores)
      .values({ actividadId, proveedorId, idExterno: limpiar(idExterno) || null });
    // Si estaba como «lo paga el cliente en el lugar», ya no lo está.
    await tx
      .update(schema.actividades)
      .set({ sePagaEnLugar: false, actualizadoEn: new Date() })
      .where(eq(schema.actividades.id, actividadId));
    await anotar(
      {
        quien: yo.id,
        texto: `${p.nombre} ligado a ${a.nombre}`,
        entidad: "actividades",
        entidadId: actividadId,
      },
      tx,
    );
  });
  revalidar(actividadId);
  return { mensaje: `${p.nombre} ligado · sus datos se consultan en Proveedores` };
}

async function liga(id: string) {
  const [l] = await db
    .select({ l: schema.actividadProveedores, proveedor: schema.proveedores.nombre })
    .from(schema.actividadProveedores)
    .innerJoin(schema.proveedores, eq(schema.proveedores.id, schema.actividadProveedores.proveedorId))
    .where(eq(schema.actividadProveedores.id, id))
    .limit(1);
  return l ?? null;
}

export async function quitarLiga(id: string): Promise<{ error?: string; mensaje?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const l = await liga(id);
  if (!l) return {};
  await db.delete(schema.actividadProveedores).where(eq(schema.actividadProveedores.id, id));
  await tocar(l.l.actividadId);
  await anotar({
    quien: yo.id,
    texto: `${l.proveedor} ya no está ligado`,
    entidad: "actividades",
    entidadId: l.l.actividadId,
  });
  revalidar(l.l.actividadId);
  return { mensaje: `${l.proveedor} ya no aparece como opción para esta actividad` };
}

/** El ID o código que la actividad tiene en ese proveedor. Opcional. */
export async function guardarIdLiga(id: string, idExterno: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const l = await liga(id);
  if (!l) return { error: "Ese proveedor ya no está ligado." };
  const nuevo = limpiar(idExterno).slice(0, 80) || null;
  if (nuevo === l.l.idExterno) return {};
  await db
    .update(schema.actividadProveedores)
    .set({ idExterno: nuevo })
    .where(eq(schema.actividadProveedores.id, id));
  await tocar(l.l.actividadId);
  await anotar({
    quien: yo.id,
    texto: nuevo ? `ID en ${l.proveedor}: ${nuevo}` : `ID en ${l.proveedor} quitado`,
    entidad: "actividades",
    entidadId: l.l.actividadId,
  });
  revalidar(l.l.actividadId);
  return {};
}

/**
 * «Lo paga el cliente en el lugar»: no se liga a ningún proveedor y no genera
 * pagos de Airoo. Al encenderlo se quitan los proveedores ligados.
 */
export async function pagaEnLugar(actividadId: string, si: boolean): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const a = await actividad(actividadId);
  if (!a) return { error: "Esa actividad ya no existe." };
  if (a.sePagaEnLugar === si) return {};
  await db.transaction(async (tx) => {
    if (si)
      await tx
        .delete(schema.actividadProveedores)
        .where(eq(schema.actividadProveedores.actividadId, actividadId));
    await tx
      .update(schema.actividades)
      .set({ sePagaEnLugar: si, actualizadoEn: new Date() })
      .where(eq(schema.actividades.id, actividadId));
    await anotar(
      {
        quien: yo.id,
        texto: si ? "Marcada como «Lo paga el cliente en el lugar»" : "Se reserva con un proveedor",
        entidad: "actividades",
        entidadId: actividadId,
      },
      tx,
    );
  });
  revalidar(actividadId);
  return {};
}

// ─── Archivar y eliminar ─────────────────────────────────────────────────────

export async function archivarActividad(
  id: string,
  archivar: boolean,
  motivo = "",
): Promise<{ error?: string }> {
  const yo = await usuarioCon("archivar_catalogos");
  if (!yo) return { error: "Tu rol no archiva actividades." };
  const a = await actividad(id);
  if (!a || !!a.archivadoEn === archivar) return {};
  await db
    .update(schema.actividades)
    .set({
      archivadoEn: archivar ? new Date() : null,
      archivadoPor: archivar ? yo.id : null,
      motivoArchivo: archivar ? limpiar(motivo) || null : null,
      actualizadoEn: new Date(),
    })
    .where(eq(schema.actividades.id, id));
  await anotar({
    quien: yo.id,
    texto: archivar
      ? `Actividad archivada: ${a.nombre}${limpiar(motivo) ? ` · ${limpiar(motivo)}` : ""}`
      : `Actividad reactivada: ${a.nombre}`,
    entidad: "actividades",
    entidadId: id,
  });
  revalidar(id);
  return {};
}

/** Viajes que usan la actividad. Las partidas de cotización llegan en la Fase 2. */
const viajesDeActividad = (id: string) => viajesQueUsan("actividadId", id);

export async function eliminarActividad(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("eliminar_catalogos");
  if (!yo) return { error: "Solo el dueño elimina actividades. Se puede archivar." };
  const a = await actividad(id);
  if (!a) return {};
  const viajes = await viajesDeActividad(id);
  if (viajes > 0)
    return {
      error: `Se usó en ${viajes} ${viajes === 1 ? "viaje" : "viajes"}, así que no se puede eliminar; se puede archivar.`,
    };
  const fotos = await db
    .select({ archivo: schema.fotos.archivo })
    .from(schema.fotos)
    .where(eq(schema.fotos.actividadId, id));
  await db.transaction(async (tx) => {
    await tx.delete(schema.actividades).where(eq(schema.actividades.id, id));
    await anotar(
      { quien: yo.id, texto: `Actividad eliminada: ${a.nombre}`, entidad: "actividades", entidadId: id },
      tx,
    );
  });
  await borrarFotos(fotos.map((f) => f.archivo));
  revalidar();
  return {};
}
