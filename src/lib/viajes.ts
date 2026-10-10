import "server-only";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Detalle, FixCotizacion, Opcion, PartidaArmador } from "@/lib/armador";
import { aCalculo, vistasDeOpcion } from "@/lib/armador";
import { partidasDeOpcion, totales, type Ajustes } from "@/lib/cotizacion";
import type { Moneda } from "@/lib/dinero";
import type { Etapa } from "@/lib/etapas";

// Lectura de viajes y cotizaciones, compartida por la lista, la vista del
// viaje y el armador. Los totales se calculan aquí con src/lib/cotizacion.ts;
// nunca se guardan.

export type Cotizacion = typeof schema.cotizaciones.$inferSelect;

/** La versión más reciente de la cotización de cada viaje. */
export async function cotizacionesActuales(viajeIds: string[]): Promise<Map<string, Cotizacion>> {
  if (!viajeIds.length) return new Map();
  const filas = await db
    .selectDistinctOn([schema.cotizaciones.viajeId])
    .from(schema.cotizaciones)
    .where(inArray(schema.cotizaciones.viajeId, viajeIds))
    .orderBy(schema.cotizaciones.viajeId, desc(schema.cotizaciones.version));
  return new Map(filas.map((c) => [c.viajeId, c]));
}

/** Partidas de varias cotizaciones con sus habitaciones, renglones, tramos y trayectos. */
export async function partidasDe(cotizacionIds: string[]): Promise<Map<string, PartidaArmador[]>> {
  const salida = new Map<string, PartidaArmador[]>(cotizacionIds.map((id) => [id, []]));
  if (!cotizacionIds.length) return salida;
  const ps = await db
    .select()
    .from(schema.partidas)
    .where(inArray(schema.partidas.cotizacionId, cotizacionIds))
    .orderBy(asc(schema.partidas.orden), asc(schema.partidas.creadoEn));
  const ids = ps.map((p) => p.id);
  if (!ids.length) return salida;
  const [habs, rens, tramos, trays] = await Promise.all([
    db
      .select()
      .from(schema.partidaHabitaciones)
      .where(inArray(schema.partidaHabitaciones.partidaId, ids))
      .orderBy(asc(schema.partidaHabitaciones.orden)),
    db
      .select()
      .from(schema.partidaRenglones)
      .where(inArray(schema.partidaRenglones.partidaId, ids))
      .orderBy(asc(schema.partidaRenglones.orden)),
    db
      .select()
      .from(schema.vueloTramos)
      .where(inArray(schema.vueloTramos.partidaId, ids))
      .orderBy(asc(schema.vueloTramos.orden)),
    db
      .select()
      .from(schema.partidaTrayectos)
      .where(inArray(schema.partidaTrayectos.partidaId, ids))
      .orderBy(asc(schema.partidaTrayectos.orden)),
  ]);
  const hora = (t: string | null) => (t ? t.slice(0, 5) : null);
  for (const p of ps) {
    salida.get(p.cotizacionId)!.push({
      id: p.id,
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
      moneda: p.moneda as Moneda,
      netoTotal: p.netoTotalCentavos,
      utilidadPb: p.utilidadPb,
      utilidadManual: p.utilidadManual,
      detalle: (p.detalle ?? {}) as Detalle,
      pagoProveedor: p.pagoProveedor,
      anticipoProveedorPb: p.anticipoProveedorPb,
      pagarAntes: p.pagarAntes,
      cancelacionGratisHasta: p.cancelacionGratisHasta,
      cancelacionTexto: p.cancelacionTexto,
      reembolsable: p.reembolsable,
      habitaciones: habs
        .filter((h) => h.partidaId === p.id)
        .map((h) => ({
          id: h.id,
          habitacionId: h.habitacionId,
          cama: h.cama,
          adultos: h.adultos,
          menores: h.menores,
        })),
      renglones: rens
        .filter((r) => r.partidaId === p.id)
        .map((r) => ({
          id: r.id,
          concepto: r.concepto,
          boletoId: r.boletoId,
          cantidad: r.cantidad,
        })),
      tramos: tramos
        .filter((t) => t.partidaId === p.id)
        .map((t) => ({
          id: t.id,
          sentido: t.sentido,
          numero: t.numero ?? "",
          fecha: t.fecha,
          origen: t.origen ?? "",
          destino: t.destino ?? "",
          terminalSalida: t.terminalSalida ?? "",
          terminalLlegada: t.terminalLlegada ?? "",
          sale: hora(t.sale),
          llega: hora(t.llega),
          llegaDias: t.llegaDias,
        })),
      trayectos: trays
        .filter((t) => t.partidaId === p.id)
        .map((t) => ({
          id: t.id,
          desde: t.desde,
          hasta: t.hasta,
          fecha: t.fecha,
          hora: hora(t.hora),
          vueloTramoId: t.vueloTramoId,
        })),
    });
  }
  return salida;
}

export async function opcionesDe(cotizacionIds: string[]): Promise<Map<string, Opcion[]>> {
  const salida = new Map<string, Opcion[]>(cotizacionIds.map((id) => [id, []]));
  if (!cotizacionIds.length) return salida;
  const filas = await db
    .select()
    .from(schema.cotizacionOpciones)
    .where(inArray(schema.cotizacionOpciones.cotizacionId, cotizacionIds))
    .orderBy(asc(schema.cotizacionOpciones.orden));
  for (const o of filas) salida.get(o.cotizacionId)!.push({ id: o.id, orden: o.orden, recomendada: o.recomendada });
  return salida;
}

export const fixDe = (c: Cotizacion): FixCotizacion => ({
  fixUsd: c.fixUsd,
  fixEur: c.fixEur,
  colchonPb: c.colchonPb,
});

export const ajustesDe = (c: Cotizacion, personas: number): Ajustes => ({
  cargoServicio: c.cargoServicioCentavos,
  conIva: c.conIva,
  ivaPb: c.ivaPb,
  personas,
});

/** Totales de cada opción (o de la cotización completa si no hay opciones). */
export function totalesPorOpcion(c: Cotizacion, partidas: PartidaArmador[], opciones: Opcion[], personas: number) {
  const fx = fixDe(c);
  const calc = partidas.map((p) => aCalculo(p, fx));
  return vistasDeOpcion(opciones).map((opcionId) => ({
    opcionId,
    totales: totales(partidasDeOpcion(calc, opcionId), ajustesDe(c, personas)),
  }));
}

// ─── Historial ──────────────────────────────────────────────────────────────

/**
 * Anota algo en el historial del viaje. Las ediciones seguidas del borrador
 * se juntan en una sola línea por media hora para no llenar la Actividad.
 */
export async function anotarEnViaje(e: {
  viajeId: string;
  tipo: string;
  texto: string;
  etiqueta?: string | null;
  quien: string | null;
  juntar?: boolean;
}) {
  if (e.juntar) {
    const [ultimo] = await db
      .select()
      .from(schema.viajeEventos)
      .where(
        and(
          eq(schema.viajeEventos.viajeId, e.viajeId),
          gt(schema.viajeEventos.creadoEn, sql`now() - interval '30 minutes'`),
        ),
      )
      .orderBy(desc(schema.viajeEventos.creadoEn))
      .limit(1);
    if (ultimo && ultimo.tipo === e.tipo && ultimo.quien === e.quien) {
      await db
        .update(schema.viajeEventos)
        .set({ texto: e.texto, etiqueta: e.etiqueta ?? null, creadoEn: new Date() })
        .where(eq(schema.viajeEventos.id, ultimo.id));
      return;
    }
  }
  await db.insert(schema.viajeEventos).values({
    viajeId: e.viajeId,
    tipo: e.tipo,
    texto: e.texto,
    etiqueta: e.etiqueta ?? null,
    quien: e.quien,
  });
}

export type Evento = {
  id: string;
  tipo: string;
  texto: string;
  etiqueta: string | null;
  quien: string | null;
  creadoEn: Date;
};

export async function eventosDe(viajeId: string, limite = 50): Promise<Evento[]> {
  const filas = await db
    .select({ e: schema.viajeEventos, quien: schema.usuarios.nombre })
    .from(schema.viajeEventos)
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.viajeEventos.quien))
    .where(eq(schema.viajeEventos.viajeId, viajeId))
    .orderBy(desc(schema.viajeEventos.creadoEn))
    .limit(limite);
  return filas.map((f) => ({
    id: f.e.id,
    tipo: f.e.tipo,
    texto: f.e.texto,
    etiqueta: f.e.etiqueta,
    quien: f.quien,
    creadoEn: f.e.creadoEn,
  }));
}

export type { Etapa };
