"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import {
  nuevoId,
  partidaNueva,
  type FixCotizacion,
  type Opcion,
  type PartidaArmador,
} from "@/lib/armador";
import type { FichaArmador, ResultadoCatalogo } from "@/lib/armador-fichas";
import { SECCIONES, type ClaveSeccion } from "@/lib/armador-textos";
import { buscarEnCatalogo, fichaDe } from "@/lib/catalogo-armador";
import { CAMAS, repartirHuespedes, type TipoPartida } from "@/lib/cotizacion";
import { MONEDAS } from "@/lib/dinero";
import { puede, puedeEditarViaje } from "@/lib/permisos";
import { MODELO_SUGERIDO, VALORES_TIPO as TIPOS_SERVICIO } from "@/lib/servicios";
import { usuarioActual } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";
import { tipoCambioVigente } from "@/lib/tipo-cambio";
import { anotarEnViaje, opcionesDe, partidasDe } from "@/lib/viajes";
import { cargarAjustes } from "@/app/(panel)/configuracion/datos";
import { aPuntosBase } from "@/lib/cotizacion";
import { ultimoAcuerdo } from "./datos";

// Todo lo que el armador guarda. Cada acción revisa que quien la pide pueda
// editar ese viaje y que la cotización siga en borrador: lo enviado no cambia.

type Error = { error: string };

const SIN_PERMISO = "Solo quien atiende el viaje (o el Dueño) puede cambiar su cotización.";

type Editable =
  | { error: string }
  | {
      error?: undefined;
      yo: Awaited<ReturnType<typeof usuarioActual>>;
      cotizacion: typeof schema.cotizaciones.$inferSelect;
      viaje: typeof schema.viajes.$inferSelect;
    };

async function editable(cotizacionId: string): Promise<Editable> {
  const yo = await usuarioActual();
  const [c] = await db
    .select({ c: schema.cotizaciones, v: schema.viajes })
    .from(schema.cotizaciones)
    .innerJoin(schema.viajes, eq(schema.viajes.id, schema.cotizaciones.viajeId))
    .where(eq(schema.cotizaciones.id, cotizacionId))
    .limit(1);
  if (!c) return { error: "Esa cotización ya no existe." };
  if (!puedeEditarViaje(yo.rol, yo.id, c.v.aCargo)) return { error: SIN_PERMISO };
  if (c.c.estado !== "borrador")
    return { error: "Esta versión ya se envió y no cambia. Editarla crea la versión siguiente." };
  return { yo, cotizacion: c.c, viaje: c.v };
}

function revalidar(folio: number) {
  revalidatePath(`/viajes/${folio}`);
  revalidatePath(`/viajes/${folio}/armador`);
  revalidatePath("/viajes");
}

const SECCION_DE: Record<TipoPartida, string> = Object.fromEntries(
  SECCIONES.map((s) => [s.tipo, s.titulo.split(" ")[0]]),
) as Record<TipoPartida, string>;

async function anotarEdicion(viajeId: string, quien: string, tipo: TipoPartida) {
  await anotarEnViaje({
    viajeId,
    tipo: "borrador",
    texto: "Se editó el borrador",
    etiqueta: SECCION_DE[tipo],
    quien,
    juntar: true,
  });
}

// ─── Catálogo ───────────────────────────────────────────────────────────────

export async function buscarCatalogo(tipo: TipoPartida, texto: string, ciudadId: string): Promise<ResultadoCatalogo[]> {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "cotizar")) return [];
  return buscarEnCatalogo(tipo, texto.slice(0, 80), ciudadId);
}

const Alta = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("hotel"),
    nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre del hotel.")),
    ciudadId: z.uuid("Falta elegir la ciudad de la lista."),
  }),
  z.object({
    tipo: z.literal("actividad"),
    nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre de la actividad.")),
    ciudadId: z.uuid("Falta elegir la ciudad de la lista."),
  }),
  z.object({
    tipo: z.literal("servicio"),
    nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre del servicio.")),
    tipoServicio: z.enum(TIPOS_SERVICIO as [string, ...string[]]),
  }),
  z.object({
    tipo: z.literal("vuelo"),
    nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre de la aerolínea.")),
    iata: z
      .string()
      .transform((v) => v.trim().toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9]{2}$/, "El código de la aerolínea lleva 2 letras o números, como VB.")),
  }),
]);

/**
 * Alta con lo mínimo desde «Agregar servicio»: nombre y ciudad. Queda en el
 * catálogo «Por completar» y lo demás se llena en su ficha.
 */
export async function altaMinima(datos: unknown): Promise<{ id: string } | Error> {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "editar_catalogos")) return { error: "Tu rol no da de alta registros en el catálogo." };
  const r = Alta.safeParse(datos);
  if (!r.success) return { error: r.error.issues[0].message };
  const d = r.data;
  const base = { nombre: d.nombre, nombreBusqueda: normalizar(d.nombre), creadoPor: yo.id };
  if (d.tipo === "hotel" || d.tipo === "actividad") {
    const [ciudad] = await db
      .select({ id: schema.ciudades.id, nombre: schema.ciudades.nombre })
      .from(schema.ciudades)
      .where(and(eq(schema.ciudades.id, d.ciudadId), isNull(schema.ciudades.archivadoEn)))
      .limit(1);
    if (!ciudad) return { error: "Esa ciudad ya no está en la lista." };
    if (d.tipo === "hotel") {
      const [h] = await db
        .insert(schema.hoteles)
        .values({ ...base, ciudadId: ciudad.id })
        .returning({ id: schema.hoteles.id });
      await anotar({ quien: yo.id, texto: `Hotel agregado desde el armador: ${d.nombre} (${ciudad.nombre})`, entidad: "hoteles", entidadId: h.id });
      revalidatePath("/hoteles");
      return { id: h.id };
    }
    const [a] = await db
      .insert(schema.actividades)
      .values({ ...base, ciudadId: ciudad.id, tipo: "tour" })
      .returning({ id: schema.actividades.id });
    await anotar({ quien: yo.id, texto: `Actividad agregada desde el armador: ${d.nombre} (${ciudad.nombre})`, entidad: "actividades", entidadId: a.id });
    revalidatePath("/actividades");
    return { id: a.id };
  }
  if (d.tipo === "servicio") {
    const tipo = d.tipoServicio as keyof typeof MODELO_SUGERIDO;
    const [s] = await db
      .insert(schema.servicios)
      .values({ ...base, tipo, modeloCobro: MODELO_SUGERIDO[tipo], variaPorReserva: true })
      .returning({ id: schema.servicios.id });
    await anotar({ quien: yo.id, texto: `Servicio agregado desde el armador: ${d.nombre}`, entidad: "servicios", entidadId: s.id });
    revalidatePath("/servicios");
    return { id: s.id };
  }
  const [ya] = await db.select({ id: schema.aerolineas.id }).from(schema.aerolineas).where(eq(schema.aerolineas.iata, d.iata)).limit(1);
  if (ya) return { id: ya.id };
  const [a] = await db
    .insert(schema.aerolineas)
    .values({ iata: d.iata, nombre: d.nombre, creadoPor: yo.id })
    .returning({ id: schema.aerolineas.id });
  await anotar({ quien: yo.id, texto: `Aerolínea agregada desde el armador: ${d.nombre} (${d.iata})`, entidad: "aerolineas", entidadId: a.id });
  revalidatePath("/aerolineas");
  return { id: a.id };
}

/** Una habitación nueva en el catálogo del hotel, desde el armador. */
export async function agregarHabitacionHotel(hotelId: string, nombre: string): Promise<{ id: string; nombre: string } | Error> {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "editar_catalogos")) return { error: "Tu rol no cambia el catálogo de hoteles." };
  const n = limpiar(nombre);
  if (n.length < 2) return { error: "Falta el nombre de la habitación." };
  const [h] = await db.select({ id: schema.hoteles.id, nombre: schema.hoteles.nombre }).from(schema.hoteles).where(eq(schema.hoteles.id, hotelId)).limit(1);
  if (!h) return { error: "Ese hotel ya no existe." };
  const [{ orden }] = await db
    .select({ orden: sql<number>`coalesce(max(${schema.hotelHabitaciones.orden}) + 1, 0)::int` })
    .from(schema.hotelHabitaciones)
    .where(eq(schema.hotelHabitaciones.hotelId, hotelId));
  const [hab] = await db
    .insert(schema.hotelHabitaciones)
    .values({ hotelId, nombreCliente: n, orden })
    .returning({ id: schema.hotelHabitaciones.id });
  await anotar({ quien: yo.id, texto: `Habitación agregada a ${h.nombre}: ${n}`, entidad: "hoteles", entidadId: hotelId });
  revalidatePath(`/hoteles/${hotelId}`);
  return { id: hab.id, nombre: n };
}

/** El acuerdo que se propone al elegir un proveedor: el último con él. */
export async function acuerdoPropuesto(proveedorId: string) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "cotizar")) return null;
  return ultimoAcuerdo(proveedorId);
}

/** Un vuelo con ese número ya capturado en otro viaje: se ofrece copiar ruta y horario. */
export async function vueloConocido(numero: string) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "cotizar")) return null;
  const n = numero.replace(/\s+/g, "").toUpperCase();
  if (n.length < 3) return null;
  const [t] = await db
    .select()
    .from(schema.vueloTramos)
    .where(sql`upper(replace(${schema.vueloTramos.numero}, ' ', '')) = ${n} and ${schema.vueloTramos.sale} is not null`)
    .orderBy(desc(schema.vueloTramos.fecha))
    .limit(1);
  if (!t) return null;
  return {
    origen: t.origen ?? "",
    destino: t.destino ?? "",
    terminalSalida: t.terminalSalida ?? "",
    terminalLlegada: t.terminalLlegada ?? "",
    sale: t.sale?.slice(0, 5) ?? null,
    llega: t.llega?.slice(0, 5) ?? null,
    llegaDiaSiguiente: t.llegaDiaSiguiente,
    duracion: t.duracion ?? "",
    escalas: t.escalas,
  };
}

// ─── Agregar al viaje ───────────────────────────────────────────────────────

export type Agregado = { partida: PartidaArmador; ficha: FichaArmador; opciones: Opcion[]; partidas: PartidaArmador[] };

export async function agregarPartida(
  cotizacionId: string,
  tipo: TipoPartida,
  catalogoId: string,
  colocacion: "estancia" | "opcion",
): Promise<Agregado | Error> {
  const e = await editable(cotizacionId);
  if (e.error !== undefined) return { error: e.error };
  const { yo, cotizacion: c, viaje: v } = e;
  const ficha = await fichaDe(tipo, catalogoId);
  if (!ficha) return { error: "Ese registro ya no está en el catálogo." };
  if (ficha.tipo === "hotel" && ficha.soloAdultos && v.menores > 0)
    return {
      error: `Este hotel es solo para adultos y en el viaje van ${v.menores} ${v.menores === 1 ? "menor" : "menores"}.`,
    };

  const ajustes = await cargarAjustes();
  const existentes = (await partidasDe([c.id])).get(c.id) ?? [];
  const opciones = (await opcionesDe([c.id])).get(c.id) ?? [];
  const hoteles = existentes.filter((p) => p.tipo === "hotel");
  const orden = existentes.reduce((m, p) => Math.max(m, p.orden), -1) + 1;
  const utilidadPb =
    tipo === "vuelo"
      ? aPuntosBase(ajustes.ganancia_defecto.vuelos)
      : tipo === "actividad"
        ? Math.max(c.utilidadBasePb, 0)
        : c.utilidadBasePb;
  const p = partidaNueva(tipo, { id: nuevoId(), utilidadPb, inicio: v.inicio, fin: v.fin, orden });
  if (tipo === "vuelo") p.utilidadManual = true;
  const personas = v.adultos + v.menores;

  // Dónde se reserva: el primero ligado en la ficha, con su último acuerdo.
  const ligado =
    tipo === "hotel"
      ? schema.hotelProveedores
      : tipo === "actividad"
        ? schema.actividadProveedores
        : tipo === "servicio"
          ? schema.servicioProveedores
          : null;
  if (ligado) {
    const col =
      ligado === schema.hotelProveedores
        ? schema.hotelProveedores.hotelId
        : ligado === schema.actividadProveedores
          ? schema.actividadProveedores.actividadId
          : schema.servicioProveedores.servicioId;
    const [l] = await db
      .select({ proveedorId: ligado.proveedorId })
      .from(ligado)
      .where(eq(col, catalogoId))
      .limit(1);
    if (l) {
      p.proveedorId = l.proveedorId;
      const a = await ultimoAcuerdo(l.proveedorId);
      if (a) {
        p.pagoProveedor = a.pagoProveedor;
        p.anticipoProveedorPb = a.anticipoProveedorPb;
      }
    }
  }

  if (ficha.tipo === "hotel") {
    p.hotelId = ficha.id;
    p.regimen = ficha.regimenes[0] ?? null;
    p.reembolsable = true;
    const n = Math.max(1, Math.ceil(personas / 4));
    if (ficha.habitaciones.length)
      p.habitaciones = repartirHuespedes(v.adultos, v.menores, n).map((h) => ({
        id: nuevoId(),
        habitacionId: ficha.habitaciones[0].id,
        cama: null,
        adultos: h.adultos,
        menores: h.menores,
        neto: null,
      }));
  }
  if (ficha.tipo === "actividad") {
    p.actividadId = ficha.id;
    p.planId = ficha.planes[0]?.id ?? null;
    p.detalle = { duracion: ficha.duracion ?? "", inclusiones: ficha.inclusiones };
    if (ficha.sePagaEnLugar) {
      p.pagoProveedor = "en_el_lugar";
      p.proveedorId = null;
    }
    const conBoletos = ficha.boletos.filter((b) => !b.gratis);
    if (conBoletos.length >= 2 && v.menores > 0) {
      // Adultos y menores por boleto; las edades del catálogo deciden después.
      p.renglones = conBoletos.slice(0, 2).map((b, i) => ({
        id: nuevoId(),
        concepto: b.nombre.split(" ")[0],
        boletoId: b.id,
        cantidad: i === 0 ? v.adultos : v.menores,
        netoUnitario: null,
      }));
    } else {
      p.renglones = [
        { id: nuevoId(), concepto: conBoletos[0]?.nombre.split(" ")[0] ?? "Por persona", boletoId: conBoletos[0]?.id ?? null, cantidad: personas, netoUnitario: null },
      ];
    }
  }
  if (ficha.tipo === "servicio") {
    p.servicioId = ficha.id;
    const variante =
      ficha.tipoServicio === "traslado"
        ? (ficha.variantes.find((x) => (x.pasajeros ?? 0) >= personas) ?? ficha.variantes[0])
        : ficha.variantes[0];
    p.varianteId = variante?.id ?? null;
    p.detalle = { personas };
    if (ficha.tipoServicio === "traslado") {
      p.detalle = { personas, recoleccion: "redondo" };
      const vuelo = existentes.find((x) => x.tipo === "vuelo");
      const ida = vuelo?.tramos.find((t) => t.sentido === "ida");
      const regreso = vuelo?.tramos.find((t) => t.sentido === "regreso");
      p.trayectos = [
        { id: nuevoId(), desde: "Aeropuerto", hasta: "Hotel", fecha: v.inicio, hora: ida?.llega ?? null, vueloTramoId: ida?.id ?? null },
        { id: nuevoId(), desde: "Hotel", hasta: "Aeropuerto", fecha: v.fin, hora: null, vueloTramoId: regreso?.id ?? null },
      ];
    }
    if (ficha.modeloCobro === "persona_dia" && ficha.tipoServicio === "seguro") p.detalle = { ...p.detalle, cobertura: "Nacional", mayores70: 0 };
    const cantidad =
      ficha.modeloCobro === "persona" || ficha.modeloCobro === "persona_dia"
        ? personas
        : ficha.modeloCobro === "dia"
          ? Math.max(1, Math.round((Date.parse(v.fin) - Date.parse(v.inicio)) / 86_400_000))
          : 1;
    p.renglones = [
      { id: nuevoId(), concepto: [variante?.nombre, "neto"].filter(Boolean).join(" · "), boletoId: null, cantidad, netoUnitario: null },
    ];
  }
  if (ficha.tipo === "vuelo") {
    p.aerolineaId = ficha.id;
    p.tarifaId = ficha.tarifas[0]?.id ?? null;
    p.detalle = { redondo: true, pasajeros: personas };
    p.renglones = [{ id: nuevoId(), concepto: "Vuelo", boletoId: null, cantidad: 1, netoUnitario: null }];
    const tramo = (sentido: "ida" | "regreso", fecha: string) => ({
      id: nuevoId(),
      sentido,
      numero: "",
      fecha,
      origen: "",
      destino: "",
      terminalSalida: "",
      terminalLlegada: "",
      sale: null,
      llega: null,
      llegaDiaSiguiente: false,
      duracion: "",
      escalas: 0,
    });
    p.tramos = [tramo("ida", v.inicio), tramo("regreso", v.fin)];
  }

  // Opciones o estancias: una cotización lleva una cosa o la otra.
  let nuevasOpciones = opciones;
  if (tipo === "hotel" && colocacion === "opcion" && hoteles.length > 0) {
    if (hoteles.length > 1 && opciones.length === 0)
      return { error: "Con varias estancias, cada una lleva un solo hotel." };
    await db.transaction(async (tx) => {
      if (opciones.length === 0) {
        const [primera] = await tx
          .insert(schema.cotizacionOpciones)
          .values({ cotizacionId: c.id, orden: 0, recomendada: true })
          .returning();
        await tx.update(schema.partidas).set({ opcionId: primera.id }).where(eq(schema.partidas.id, hoteles[0].id));
      }
      const [{ orden: siguiente }] = await tx
        .select({ orden: sql<number>`coalesce(max(${schema.cotizacionOpciones.orden}) + 1, 0)::int` })
        .from(schema.cotizacionOpciones)
        .where(eq(schema.cotizacionOpciones.cotizacionId, c.id));
      const [nueva] = await tx
        .insert(schema.cotizacionOpciones)
        .values({ cotizacionId: c.id, orden: siguiente })
        .returning();
      p.opcionId = nueva.id;
    });
    nuevasOpciones = (await opcionesDe([c.id])).get(c.id) ?? [];
  } else if (tipo === "hotel" && colocacion === "estancia" && opciones.length > 0) {
    return { error: "Con opciones de hotel, todas son para las mismas fechas. Para otra estancia, deja una sola opción." };
  }

  await escribirPartida(c.id, p, yo.id, true);
  await anotarEdicion(v.id, yo.id, tipo);
  revalidar(v.folio);
  const todas = (await partidasDe([c.id])).get(c.id) ?? [];
  return { partida: todas.find((x) => x.id === p.id)!, ficha, opciones: nuevasOpciones, partidas: todas };
}

// ─── Guardar una partida ────────────────────────────────────────────────────

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const hora = z.string().regex(/^\d{2}:\d{2}$/).nullable();
const centavos = z.number().int().min(0).max(100_000_000_00).nullable();
const id = z.uuid();
const texto = (max: number) => z.string().max(max).transform((v) => v.trim());

const Partida = z.object({
  id,
  tipo: z.enum(["hotel", "vuelo", "actividad", "servicio"]),
  opcionId: id.nullable(),
  orden: z.number().int(),
  hotelId: id.nullable(),
  actividadId: id.nullable(),
  servicioId: id.nullable(),
  aerolineaId: id.nullable(),
  planId: id.nullable(),
  varianteId: id.nullable(),
  tarifaId: id.nullable(),
  proveedorId: id.nullable(),
  regimen: z.string().max(4).nullable(),
  fechaInicio: dia,
  fechaFin: dia,
  moneda: z.enum(MONEDAS),
  utilidadPb: z.number().int().min(0).max(10_000),
  utilidadManual: z.boolean(),
  detalle: z.object({
    redondo: z.boolean().optional(),
    pasajeros: z.number().int().min(0).max(500).optional(),
    tua: texto(200).optional(),
    duracion: texto(80).optional(),
    inclusiones: texto(2000).optional(),
    personas: z.number().int().min(0).max(500).optional(),
    recoleccion: z.enum(["ida", "regreso", "redondo"]).optional(),
    duracionAprox: texto(40).optional(),
    cobertura: texto(80).optional(),
    mayores70: z.number().int().min(0).max(500).optional(),
    dias: z.number().int().min(0).max(400).optional(),
  }),
  pagoProveedor: z.enum(["al_reservar", "anticipo", "en_el_lugar"]),
  anticipoProveedorPb: z.number().int().min(0).max(10_000),
  pagarAntes: dia,
  cancelacionGratisHasta: dia,
  cancelacionTexto: texto(300).nullable(),
  reembolsable: z.boolean(),
  habitaciones: z
    .array(
      z.object({
        id,
        habitacionId: id,
        cama: z.enum(CAMAS).nullable(),
        adultos: z.number().int().min(0).max(12),
        menores: z.number().int().min(0).max(12),
        neto: centavos,
      }),
    )
    .max(30),
  renglones: z
    .array(
      z.object({
        id,
        concepto: texto(120),
        boletoId: id.nullable(),
        cantidad: z.number().int().min(0).max(10_000),
        netoUnitario: centavos,
      }),
    )
    .max(30),
  tramos: z
    .array(
      z.object({
        id,
        sentido: z.enum(["ida", "regreso"]),
        numero: texto(12),
        fecha: dia,
        origen: texto(80),
        destino: texto(80),
        terminalSalida: texto(10),
        terminalLlegada: texto(10),
        sale: hora,
        llega: hora,
        llegaDiaSiguiente: z.boolean(),
        duracion: texto(20),
        escalas: z.number().int().min(0).max(5),
      }),
    )
    .max(8),
  trayectos: z
    .array(
      z.object({
        id,
        desde: texto(80),
        hasta: texto(80),
        fecha: dia,
        hora,
        vueloTramoId: id.nullable(),
      }),
    )
    .max(8),
});

/**
 * Escribe la partida con todo lo que lleva. Los renglones, habitaciones,
 * tramos y trayectos conservan su id: así un traslado sigue ligado a su vuelo.
 */
async function escribirPartida(cotizacionId: string, p: PartidaArmador, quien: string, nueva: boolean) {
  const valores = {
    tipo: p.tipo,
    opcionId: p.opcionId,
    orden: p.orden,
    hotelId: p.hotelId,
    actividadId: p.actividadId,
    servicioId: p.servicioId,
    aerolineaId: p.aerolineaId,
    planId: p.planId,
    varianteId: p.varianteId,
    tarifaId: p.tarifaId,
    proveedorId: p.proveedorId,
    regimen: p.regimen,
    fechaInicio: p.fechaInicio,
    fechaFin: p.fechaFin,
    moneda: p.moneda,
    utilidadPb: p.utilidadPb,
    utilidadManual: p.utilidadManual,
    detalle: p.detalle,
    pagoProveedor: p.pagoProveedor,
    anticipoProveedorPb: p.pagoProveedor === "anticipo" ? p.anticipoProveedorPb : 0,
    pagarAntes: p.pagarAntes,
    cancelacionGratisHasta: p.cancelacionGratisHasta,
    cancelacionTexto: p.cancelacionTexto || null,
    reembolsable: p.reembolsable,
    actualizadoEn: new Date(),
  };
  await db.transaction(async (tx) => {
    if (nueva) await tx.insert(schema.partidas).values({ id: p.id, cotizacionId, creadoPor: quien, ...valores });
    else
      await tx
        .update(schema.partidas)
        .set(valores)
        .where(and(eq(schema.partidas.id, p.id), eq(schema.partidas.cotizacionId, cotizacionId)));

    const sincronizar = async <T extends { id: string }>(
      tabla: typeof schema.partidaHabitaciones | typeof schema.partidaRenglones | typeof schema.vueloTramos | typeof schema.partidaTrayectos,
      filas: T[],
      aFila: (x: T, orden: number) => Record<string, unknown>,
    ) => {
      const ids = filas.map((x) => x.id);
      await tx
        .delete(tabla)
        .where(ids.length ? and(eq(tabla.partidaId, p.id), notInArray(tabla.id, ids)) : eq(tabla.partidaId, p.id));
      for (const [i, x] of filas.entries()) {
        const fila = { id: x.id, partidaId: p.id, ...aFila(x, i) };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(tabla).values(fila as any).onConflictDoUpdate({ target: tabla.id, set: fila as any, where: eq(tabla.partidaId, p.id) });
      }
    };
    await sincronizar(schema.partidaHabitaciones, p.habitaciones, (h, orden) => ({
      habitacionId: h.habitacionId,
      cama: h.cama,
      adultos: h.adultos,
      menores: h.menores,
      netoCentavos: h.neto,
      orden,
    }));
    await sincronizar(schema.partidaRenglones, p.renglones, (r, orden) => ({
      concepto: r.concepto || "Neto",
      boletoId: r.boletoId,
      cantidad: r.cantidad,
      netoUnitarioCentavos: r.netoUnitario,
      orden,
    }));
    await sincronizar(schema.vueloTramos, p.tramos, (t, orden) => ({
      sentido: t.sentido,
      orden,
      numero: t.numero || null,
      fecha: t.fecha,
      origen: t.origen || null,
      destino: t.destino || null,
      terminalSalida: t.terminalSalida || null,
      terminalLlegada: t.terminalLlegada || null,
      sale: t.sale,
      llega: t.llega,
      llegaDiaSiguiente: t.llegaDiaSiguiente,
      duracion: t.duracion || null,
      escalas: t.escalas,
    }));
    await sincronizar(schema.partidaTrayectos, p.trayectos, (t, orden) => ({
      orden,
      desde: t.desde || "—",
      hasta: t.hasta || "—",
      fecha: t.fecha,
      hora: t.hora,
      vueloTramoId: t.vueloTramoId,
    }));
  });
}

export type Guardado = { fx?: FixCotizacion & { fecha: string | null } } | Error;

export async function guardarPartida(cotizacionId: string, datos: PartidaArmador): Promise<Guardado> {
  const e = await editable(cotizacionId);
  if (e.error !== undefined) return { error: e.error };
  const { yo, cotizacion: c, viaje: v } = e;
  const r = Partida.safeParse(datos);
  if (!r.success) return { error: "No se pudo guardar: " + r.error.issues[0].message };
  const p = r.data as PartidaArmador;

  const [actual] = await db
    .select({ tipo: schema.partidas.tipo, opcionId: schema.partidas.opcionId })
    .from(schema.partidas)
    .where(and(eq(schema.partidas.id, p.id), eq(schema.partidas.cotizacionId, c.id)))
    .limit(1);
  if (!actual) return { error: "Ese servicio ya no está en la cotización." };
  // Lo que no se cambia desde aquí: el tipo y la opción.
  p.tipo = actual.tipo;
  p.opcionId = actual.opcionId;
  if (p.tipo === "vuelo") {
    const ajustes = await cargarAjustes();
    p.utilidadPb = aPuntosBase(ajustes.ganancia_defecto.vuelos);
  }
  // Los trayectos solo se ligan a vuelos de esta misma cotización.
  const ligas = p.trayectos.map((t) => t.vueloTramoId).filter((x): x is string => !!x);
  if (ligas.length) {
    const validas = await db
      .select({ id: schema.vueloTramos.id })
      .from(schema.vueloTramos)
      .innerJoin(schema.partidas, eq(schema.partidas.id, schema.vueloTramos.partidaId))
      .where(and(inArray(schema.vueloTramos.id, ligas), eq(schema.partidas.cotizacionId, c.id)));
    const ok = new Set(validas.map((x) => x.id));
    for (const t of p.trayectos) if (t.vueloTramoId && !ok.has(t.vueloTramoId)) t.vueloTramoId = null;
  }

  await escribirPartida(c.id, p, yo.id, false);

  // El FIX se fija con su fecha al capturar la primera tarifa en esa moneda.
  let fx: Guardado = {};
  if (p.moneda !== "MXN" && (p.moneda === "USD" ? !c.fixUsd : !c.fixEur)) {
    const t = await tipoCambioVigente(p.moneda);
    if (t) {
      const cambios = p.moneda === "USD" ? { fixUsd: t.diezmilesimos } : { fixEur: t.diezmilesimos };
      const [nueva] = await db
        .update(schema.cotizaciones)
        .set({ ...cambios, fixFecha: c.fixFecha ?? t.fecha, actualizadoEn: new Date() })
        .where(eq(schema.cotizaciones.id, c.id))
        .returning();
      fx = { fx: { fixUsd: nueva.fixUsd, fixEur: nueva.fixEur, colchonPb: nueva.colchonPb, fecha: nueva.fixFecha } };
    }
  }
  await anotarEdicion(v.id, yo.id, p.tipo);
  revalidar(v.folio);
  return fx;
}

// ─── Quitar, opciones, ajustes y notas ──────────────────────────────────────

export async function eliminarPartida(
  cotizacionId: string,
  partidaId: string,
): Promise<{ opciones: Opcion[]; partidas: PartidaArmador[] } | Error> {
  const e = await editable(cotizacionId);
  if (e.error !== undefined) return { error: e.error };
  const { yo, cotizacion: c, viaje: v } = e;
  const [p] = await db
    .select()
    .from(schema.partidas)
    .where(and(eq(schema.partidas.id, partidaId), eq(schema.partidas.cotizacionId, c.id)))
    .limit(1);
  if (!p) return { error: "Ese servicio ya no está en la cotización." };
  await db.transaction(async (tx) => {
    await tx.delete(schema.partidas).where(eq(schema.partidas.id, p.id));
    if (p.opcionId) {
      // La opción se va con su hotel. Si queda una sola, vuelve a ser estancia.
      await tx.delete(schema.cotizacionOpciones).where(eq(schema.cotizacionOpciones.id, p.opcionId));
      const restantes = await tx
        .select()
        .from(schema.cotizacionOpciones)
        .where(eq(schema.cotizacionOpciones.cotizacionId, c.id))
        .orderBy(asc(schema.cotizacionOpciones.orden));
      if (restantes.length === 1) {
        await tx.update(schema.partidas).set({ opcionId: null }).where(eq(schema.partidas.opcionId, restantes[0].id));
        await tx.delete(schema.cotizacionOpciones).where(eq(schema.cotizacionOpciones.id, restantes[0].id));
      } else {
        for (const [i, o] of restantes.entries())
          await tx
            .update(schema.cotizacionOpciones)
            .set({ orden: i, recomendada: o.recomendada || (i === 0 && !restantes.some((x) => x.recomendada)) })
            .where(eq(schema.cotizacionOpciones.id, o.id));
      }
    }
  });
  await anotarEdicion(v.id, yo.id, p.tipo);
  revalidar(v.folio);
  return {
    opciones: (await opcionesDe([c.id])).get(c.id) ?? [],
    partidas: (await partidasDe([c.id])).get(c.id) ?? [],
  };
}

export async function marcarRecomendada(cotizacionId: string, opcionId: string): Promise<Opcion[] | Error> {
  const e = await editable(cotizacionId);
  if (e.error !== undefined) return { error: e.error };
  await db
    .update(schema.cotizacionOpciones)
    .set({ recomendada: sql`${schema.cotizacionOpciones.id} = ${opcionId}` })
    .where(eq(schema.cotizacionOpciones.cotizacionId, cotizacionId));
  revalidar(e.viaje.folio);
  return (await opcionesDe([cotizacionId])).get(cotizacionId) ?? [];
}

const Ajustes = z.object({
  validaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Falta la fecha de vigencia."),
  utilidadBasePb: z.number().int().min(0).max(10_000),
  conIva: z.boolean(),
});

/**
 * Ajustes de la cotización. La utilidad base se hereda en las partidas que no
 * se cambiaron a mano; los vuelos se quedan con su utilidad fija.
 */
export async function guardarAjustes(cotizacionId: string, datos: z.input<typeof Ajustes>): Promise<{ error?: string }> {
  const e = await editable(cotizacionId);
  if (e.error !== undefined) return { error: e.error };
  const r = Ajustes.safeParse(datos);
  if (!r.success) return { error: r.error.issues[0].message };
  const { yo, cotizacion: c, viaje: v } = e;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.cotizaciones)
      .set({ ...r.data, actualizadoEn: new Date() })
      .where(eq(schema.cotizaciones.id, c.id));
    if (r.data.utilidadBasePb !== c.utilidadBasePb)
      await tx
        .update(schema.partidas)
        .set({ utilidadPb: r.data.utilidadBasePb })
        .where(
          and(
            eq(schema.partidas.cotizacionId, c.id),
            eq(schema.partidas.utilidadManual, false),
            sql`${schema.partidas.tipo} <> 'vuelo'`,
          ),
        );
  });
  await anotarEnViaje({ viajeId: v.id, tipo: "borrador", texto: "Se editó el borrador", etiqueta: "Ajustes", quien: yo.id, juntar: true });
  revalidar(v.folio);
  return {};
}

export async function guardarNota(cotizacionId: string, seccion: ClaveSeccion, nota: string): Promise<{ error?: string }> {
  const e = await editable(cotizacionId);
  if (e.error !== undefined) return { error: e.error };
  if (!SECCIONES.some((s) => s.clave === seccion)) return { error: "Esa sección no existe." };
  const t = nota.trim();
  if (t.length > 600) return { error: "La nota lleva hasta 600 caracteres." };
  const notas = { ...(e.cotizacion.notas ?? {}), [seccion]: t || undefined };
  await db.update(schema.cotizaciones).set({ notas, actualizadoEn: new Date() }).where(eq(schema.cotizaciones.id, cotizacionId));
  revalidar(e.viaje.folio);
  return {};
}
