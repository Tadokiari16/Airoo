"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { aPuntosBase, vigencia } from "@/lib/cotizacion";
import { generarToken } from "@/lib/enlaces";
import { folioTexto } from "@/lib/etapas";
import { hoyEnCancun, rangoCorto } from "@/lib/fechas";
import { puede, puedeEditarViaje } from "@/lib/permisos";
import { usuarioActual, usuarioCon } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";
import { textoViajeros } from "@/lib/etapas";
import { anotarEnViaje } from "@/lib/viajes";
import { cargarAjustes } from "../configuracion/datos";
import { buscarClientes as buscar, serviciosFueraDeFechas, type ClienteOpcion } from "./datos";

const RUTA = "/viajes";

export async function buscarClientes(texto: string): Promise<ClienteOpcion[]> {
  const yo = await usuarioCon("cotizar");
  if (!yo) return [];
  return buscar(texto);
}

// ─── Nuevo viaje ────────────────────────────────────────────────────────────

const dia = (msg: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg);

const Nuevo = z
  .object({
    clienteId: z.string(),
    clienteNombre: z.string().transform(limpiar),
    clienteWhatsapp: z.string().transform((v) => v.replace(/[^\d+]/g, "")),
    ciudadDestinoId: z.uuid("Falta elegir el destino de la lista de ciudades."),
    ciudadSalidaId: z.string(),
    inicio: dia("Falta la fecha de salida."),
    fin: dia("Falta la fecha de regreso."),
    adultos: z.coerce.number().int().min(1, "Viaja al menos un adulto.").max(40, "Hasta 40 adultos."),
    menores: z.coerce.number().int().min(0).max(20, "Hasta 20 menores."),
    edades: z.string(),
    aCargo: z.string(),
  })
  .refine((v) => v.fin >= v.inicio, { message: "El regreso es antes de la salida.", path: ["fin"] })
  .refine((v) => v.clienteId || v.clienteNombre.length >= 2, {
    message: "Falta el nombre del cliente.",
    path: ["clienteNombre"],
  });

export type ResultadoNuevo = { error: string } | undefined;

/** Las edades de los menores, separadas por coma. Devuelve el texto del error si algo no cuadra. */
function leerEdades(texto: string, menores: number): number[] | string {
  const edades = texto
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number);
  if (edades.some((e) => !Number.isInteger(e) || e < 0 || e > 17)) return "La edad de cada menor va de 0 a 17 años.";
  if (edades.length > menores) return "Hay más edades que menores.";
  return edades;
}

/** Siguiente folio libre: los de ejemplo conservan el suyo y se saltan. */
async function siguienteFolio(tx: Pick<typeof db, "execute">): Promise<number> {
  for (;;) {
    const [f] = await tx.execute<{ n: string }>(sql`select nextval('folio_viaje') as n`);
    const n = Number(f.n);
    const [usado] = await tx.execute(sql`select 1 from viajes where folio = ${n}`);
    if (!usado) return n;
  }
}

export async function crearViaje(_: ResultadoNuevo, f: FormData): Promise<ResultadoNuevo> {
  const yo = await usuarioCon("cotizar");
  if (!yo) return { error: "Tu rol puede consultar viajes, pero no crearlos." };
  const r = Nuevo.safeParse({
    clienteId: "",
    clienteNombre: "",
    clienteWhatsapp: "",
    ciudadSalidaId: "",
    edades: "",
    aCargo: "",
    ...Object.fromEntries(f),
  });
  if (!r.success) return { error: r.error.issues[0].message };
  const v = r.data;

  const edades = leerEdades(v.edades, v.menores);
  if (typeof edades === "string") return { error: edades };

  // Quién lo atiende: la asesora, ella misma; el Dueño elige.
  let aCargo = yo.id;
  if (puede(yo.rol, "editar_todos_los_viajes") && v.aCargo) {
    const [u] = await db
      .select({ id: schema.usuarios.id })
      .from(schema.usuarios)
      .where(and(eq(schema.usuarios.id, v.aCargo), eq(schema.usuarios.activo, true)))
      .limit(1);
    if (!u) return { error: "Esa persona ya no está en el equipo." };
    aCargo = u.id;
  }

  const ciudad = async (id: string) =>
    (
      await db
        .select({ id: schema.ciudades.id, nombre: schema.ciudades.nombre })
        .from(schema.ciudades)
        .where(and(eq(schema.ciudades.id, id), isNull(schema.ciudades.archivadoEn)))
        .limit(1)
    )[0];
  const destino = await ciudad(v.ciudadDestinoId);
  if (!destino) return { error: "Ese destino ya no está en la lista." };
  const salida = v.ciudadSalidaId ? await ciudad(v.ciudadSalidaId) : null;

  const ajustes = await cargarAjustes();
  const hoy = hoyEnCancun();

  const folio = await db.transaction(async (tx) => {
    let clienteId = v.clienteId;
    if (clienteId) {
      const [c] = await tx
        .select({ id: schema.clientes.id })
        .from(schema.clientes)
        .where(eq(schema.clientes.id, clienteId))
        .limit(1);
      if (!c) clienteId = "";
    }
    if (!clienteId) {
      const [c] = await tx
        .insert(schema.clientes)
        .values({
          nombre: v.clienteNombre,
          nombreBusqueda: normalizar(v.clienteNombre),
          whatsapp: v.clienteWhatsapp || null,
          creadoPor: yo.id,
        })
        .returning({ id: schema.clientes.id });
      clienteId = c.id;
    }
    const folio = await siguienteFolio(tx);
    const [viaje] = await tx
      .insert(schema.viajes)
      .values({
        folio,
        clienteId,
        aCargo,
        ciudadDestinoId: destino.id,
        ciudadSalidaId: salida?.id ?? null,
        inicio: v.inicio,
        fin: v.fin,
        adultos: v.adultos,
        menores: v.menores,
        edadesMenores: edades,
        tokenCliente: generarToken(),
        creadoPor: yo.id,
      })
      .returning({ id: schema.viajes.id });
    // Primera versión de la cotización, con los ajustes de hoy copiados.
    await tx.insert(schema.cotizaciones).values({
      viajeId: viaje.id,
      version: 1,
      validaHasta: vigencia(hoy, ajustes.vigencia_cotizacion.dias, []).propuesta,
      utilidadBasePb: aPuntosBase(ajustes.ganancia_defecto.hoteles),
      ivaPb: aPuntosBase(ajustes.iva.porcentaje),
      cargoServicioCentavos: ajustes.cargo_servicio.centavos,
      colchonPb: aPuntosBase(ajustes.colchon_tipo_cambio.porcentaje),
      creadoPor: yo.id,
    });
    await tx.insert(schema.viajeEventos).values({
      viajeId: viaje.id,
      tipo: "creado",
      texto: "Se creó el viaje",
      quien: yo.id,
    });
    await anotar(
      { quien: yo.id, texto: `Viaje creado: ${folioTexto(folio)} · ${destino.nombre}`, entidad: "viajes", entidadId: viaje.id },
      tx,
    );
    return folio;
  });

  revalidatePath(RUTA);
  redirect(`${RUTA}/${folio}`);
}

// ─── Nota interna y quién lo atiende ────────────────────────────────────────

async function viajePorId(id: string) {
  const [v] = await db.select().from(schema.viajes).where(eq(schema.viajes.id, id)).limit(1);
  return v ?? null;
}

/** Nota para el equipo: la escriben los tres roles y nunca la ve el cliente. */
export async function guardarNotaInterna(viajeId: string, texto: string): Promise<{ error?: string }> {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_viajes")) return { error: "Tu rol no ve viajes." };
  const nota = limpiar(texto);
  if (nota.length < 2) return { error: "La nota está vacía." };
  if (nota.length > 1000) return { error: "La nota lleva hasta 1000 caracteres." };
  const v = await viajePorId(viajeId);
  if (!v) return { error: "Ese viaje ya no existe." };
  await anotarEnViaje({ viajeId, tipo: "nota", texto: nota, etiqueta: "Nota interna", quien: yo.id });
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${v.folio}`);
  return {};
}

export async function cambiarACargo(viajeId: string, usuarioId: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_todos_los_viajes");
  if (!yo) return { error: "Solo el dueño cambia quién atiende un viaje." };
  const v = await viajePorId(viajeId);
  if (!v) return { error: "Ese viaje ya no existe." };
  const [u] = await db
    .select({ id: schema.usuarios.id, nombre: schema.usuarios.nombre, rol: schema.usuarios.rol })
    .from(schema.usuarios)
    .where(and(eq(schema.usuarios.id, usuarioId), eq(schema.usuarios.activo, true)))
    .limit(1);
  if (!u || u.rol === "contador") return { error: "Esa persona no atiende viajes." };
  if (v.aCargo === u.id) return {};
  await db
    .update(schema.viajes)
    .set({ aCargo: u.id, actualizadoEn: new Date() })
    .where(eq(schema.viajes.id, viajeId));
  await anotarEnViaje({ viajeId, tipo: "a_cargo", texto: `Ahora lo atiende ${u.nombre}`, quien: yo.id });
  await anotar({
    quien: yo.id,
    texto: `${folioTexto(v.folio)} ahora lo atiende ${u.nombre}`,
    entidad: "viajes",
    entidadId: viajeId,
  });
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${v.folio}`);
  return {};
}


// ─── Editar el viaje ────────────────────────────────────────────────────────

export type ResultadoEdicion =
  | { error: string }
  | { ok: true; cambios: string[]; fuera: string[] };

/**
 * Cliente, destino, fechas y pasajeros del viaje. Los servicios no se tocan: los que
 * queden fuera de las fechas nuevas se devuelven para marcarlos, no se mueven en silencio.
 */
export async function editarViaje(viajeId: string, f: FormData): Promise<ResultadoEdicion> {
  const yo = await usuarioActual();
  const antes = await viajePorId(viajeId);
  if (!antes) return { error: "Ese viaje ya no existe." };
  if (!puedeEditarViaje(yo.rol, yo.id, antes.aCargo)) return { error: "Tu rol puede consultar este viaje, pero no cambiarlo." };

  const r = Nuevo.safeParse({
    clienteId: "",
    clienteNombre: "",
    clienteWhatsapp: "",
    ciudadSalidaId: "",
    edades: "",
    aCargo: "",
    ...Object.fromEntries(f),
  });
  if (!r.success) return { error: r.error.issues[0].message };
  const v = r.data;
  const edades = leerEdades(v.edades, v.menores);
  if (typeof edades === "string") return { error: edades };

  const ciudad = async (id: string) =>
    (
      await db
        .select({ id: schema.ciudades.id, nombre: schema.ciudades.nombre })
        .from(schema.ciudades)
        .where(eq(schema.ciudades.id, id))
        .limit(1)
    )[0];
  const destino = await ciudad(v.ciudadDestinoId);
  if (!destino) return { error: "Ese destino ya no está en la lista." };
  const salida = v.ciudadSalidaId ? await ciudad(v.ciudadSalidaId) : null;

  const [clienteAntes] = await db
    .select({ id: schema.clientes.id, nombre: schema.clientes.nombre })
    .from(schema.clientes)
    .where(eq(schema.clientes.id, antes.clienteId))
    .limit(1);
  const [destinoAntes] = await db
    .select({ nombre: schema.ciudades.nombre })
    .from(schema.ciudades)
    .where(eq(schema.ciudades.id, antes.ciudadDestinoId))
    .limit(1);

  const cambios = await db.transaction(async (tx) => {
    // El cliente del viaje: el que se eligió, uno nuevo con los datos escritos, o el mismo de antes.
    let cliente = clienteAntes ?? null;
    if (v.clienteId) {
      const [c] = await tx
        .select({ id: schema.clientes.id, nombre: schema.clientes.nombre })
        .from(schema.clientes)
        .where(eq(schema.clientes.id, v.clienteId))
        .limit(1);
      if (c) cliente = c;
    } else if (v.clienteNombre) {
      const [c] = await tx
        .insert(schema.clientes)
        .values({
          nombre: v.clienteNombre,
          nombreBusqueda: normalizar(v.clienteNombre),
          whatsapp: v.clienteWhatsapp || null,
          creadoPor: yo.id,
        })
        .returning({ id: schema.clientes.id, nombre: schema.clientes.nombre });
      cliente = c;
    }

    await tx
      .update(schema.viajes)
      .set({
        clienteId: cliente?.id ?? antes.clienteId,
        ciudadDestinoId: destino.id,
        ciudadSalidaId: salida?.id ?? null,
        inicio: v.inicio,
        fin: v.fin,
        adultos: v.adultos,
        menores: v.menores,
        edadesMenores: edades,
        actualizadoEn: new Date(),
      })
      .where(eq(schema.viajes.id, viajeId));

    const cambios: string[] = [];
    if (cliente && cliente.id !== antes.clienteId) cambios.push(`Cliente: ${clienteAntes?.nombre ?? "—"} → ${cliente.nombre}`);
    if (destino.id !== antes.ciudadDestinoId) cambios.push(`Destino: ${destinoAntes?.nombre ?? "—"} → ${destino.nombre}`);
    if ((salida?.id ?? null) !== antes.ciudadSalidaId) cambios.push("Ciudad de salida");
    if (v.inicio !== antes.inicio || v.fin !== antes.fin)
      cambios.push(`Fechas: ${rangoCorto(antes.inicio, antes.fin)} → ${rangoCorto(v.inicio, v.fin)}`);
    if (v.adultos !== antes.adultos || v.menores !== antes.menores)
      cambios.push(`Pasajeros: ${textoViajeros(antes.adultos, antes.menores)} → ${textoViajeros(v.adultos, v.menores)}`);
    else if (edades.join(",") !== antes.edadesMenores.join(",")) cambios.push("Edades de los menores");

    if (cambios.length) {
      await tx.insert(schema.viajeEventos).values({
        viajeId,
        tipo: "viaje",
        texto: "Se editó el viaje",
        etiqueta: cambios.join(" · "),
        quien: yo.id,
      });
      await anotar(
        { quien: yo.id, texto: `${folioTexto(antes.folio)} editado: ${cambios.join(" · ")}`, entidad: "viajes", entidadId: viajeId },
        tx,
      );
    }
    return cambios;
  });

  const fuera = cambios.some((c) => c.startsWith("Fechas"))
    ? await serviciosFueraDeFechas(viajeId, v.inicio, v.fin)
    : [];
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${antes.folio}`);
  revalidatePath(`${RUTA}/${antes.folio}/armador`);
  return { ok: true, cambios, fuera };
}
