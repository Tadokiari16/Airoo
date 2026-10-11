import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { urlFoto } from "@/lib/imagenes";
import { textoTarifa } from "@/lib/aerolineas";
import { textoCapacidad } from "@/lib/traslados";
import { normalizar } from "@/lib/texto";
import type { FichaArmador, ResultadoCatalogo } from "@/lib/armador-fichas";
import type { TipoPartida } from "@/lib/cotizacion";

export type { FichaArmador, ResultadoCatalogo };

// Lo que el armador necesita saber de cada hotel, actividad, servicio o
// aerolínea: nombres, habitaciones, boletos, variantes y tarifas. Nunca
// precios: esos se capturan en cada cotización.

const ciudadTexto = sql<string>`${schema.ciudades.nombre} || ', ' || ${schema.ciudades.region}`;

export async function fichasHoteles(ids: string[]): Promise<FichaArmador[]> {
  if (!ids.length) return [];
  const [hs, habs, portadas] = await Promise.all([
    db
      .select({
        id: schema.hoteles.id,
        nombre: schema.hoteles.nombre,
        lugar: ciudadTexto,
        ciudadId: schema.hoteles.ciudadId,
        regimenes: schema.hoteles.regimenes,
        soloAdultos: schema.hoteles.soloAdultos,
        descripcion: schema.hoteles.descripcion,
      })
      .from(schema.hoteles)
      .innerJoin(schema.ciudades, eq(schema.ciudades.id, schema.hoteles.ciudadId))
      .where(inArray(schema.hoteles.id, ids)),
    db
      .select()
      .from(schema.hotelHabitaciones)
      .where(inArray(schema.hotelHabitaciones.hotelId, ids))
      .orderBy(asc(schema.hotelHabitaciones.orden)),
    db
      .select({ hotelId: schema.fotos.hotelId, archivo: schema.fotos.archivo })
      .from(schema.fotos)
      .where(and(inArray(schema.fotos.hotelId, ids), eq(schema.fotos.esPortada, true))),
  ]);
  return hs.map((h) => {
    const portada = portadas.find((p) => p.hotelId === h.id);
    return {
      tipo: "hotel" as const,
      id: h.id,
      nombre: h.nombre,
      lugar: h.lugar,
      ciudadId: h.ciudadId,
      foto: portada ? urlFoto(portada.archivo, "c") : null,
      regimenes: h.regimenes,
      soloAdultos: h.soloAdultos,
      habitaciones: habs.filter((x) => x.hotelId === h.id).map((x) => ({ id: x.id, nombre: x.nombreCliente })),
      porCompletar: !portada && !h.descripcion,
    };
  });
}

export async function fichasActividades(ids: string[]): Promise<FichaArmador[]> {
  if (!ids.length) return [];
  const [as, planes, boletos, portadas] = await Promise.all([
    db
      .select({
        id: schema.actividades.id,
        nombre: schema.actividades.nombre,
        lugar: ciudadTexto,
        ciudadId: schema.actividades.ciudadId,
        duracion: schema.actividades.duracion,
        incluye: schema.actividades.incluye,
        noIncluye: schema.actividades.noIncluye,
        cobro: schema.actividades.cobro,
        llegada: schema.actividades.llegada,
        sePagaEnLugar: schema.actividades.sePagaEnLugar,
        descripcion: schema.actividades.descripcion,
      })
      .from(schema.actividades)
      .innerJoin(schema.ciudades, eq(schema.ciudades.id, schema.actividades.ciudadId))
      .where(inArray(schema.actividades.id, ids)),
    db
      .select()
      .from(schema.actividadPlanes)
      .where(inArray(schema.actividadPlanes.actividadId, ids))
      .orderBy(asc(schema.actividadPlanes.orden)),
    db
      .select()
      .from(schema.actividadBoletos)
      .where(inArray(schema.actividadBoletos.actividadId, ids))
      .orderBy(asc(schema.actividadBoletos.orden)),
    db
      .select({ actividadId: schema.fotos.actividadId, archivo: schema.fotos.archivo })
      .from(schema.fotos)
      .where(and(inArray(schema.fotos.actividadId, ids), eq(schema.fotos.esPortada, true))),
  ]);
  return as.map((a) => {
    const portada = portadas.find((p) => p.actividadId === a.id);
    const inclusiones = [a.incluye ? `Incluye: ${a.incluye}` : "", a.noIncluye ? `No incluye: ${a.noIncluye}` : ""]
      .filter(Boolean)
      .join("\n");
    return {
      tipo: "actividad" as const,
      id: a.id,
      nombre: a.nombre,
      lugar: a.lugar,
      ciudadId: a.ciudadId,
      foto: portada ? urlFoto(portada.archivo, "c") : null,
      duracion: a.duracion,
      inclusiones,
      cobro: a.cobro,
      llegada: a.llegada,
      sePagaEnLugar: a.sePagaEnLugar,
      planes: planes.filter((p) => p.actividadId === a.id).map((p) => ({ id: p.id, nombre: p.nombre })),
      boletos: boletos
        .filter((b) => b.actividadId === a.id)
        .map((b) => ({ id: b.id, nombre: b.nombre, edadDesde: b.edadDesde, edadHasta: b.edadHasta, gratis: b.gratis })),
      porCompletar: !portada && !a.descripcion,
    };
  });
}

export async function fichasServicios(ids: string[]): Promise<FichaArmador[]> {
  if (!ids.length) return [];
  const [ss, variantes] = await Promise.all([
    db
      .select({
        id: schema.servicios.id,
        nombre: schema.servicios.nombre,
        destino: schema.servicios.destino,
        tipo: schema.servicios.tipo,
        modeloCobro: schema.servicios.modeloCobro,
        notaCobro: schema.servicios.notaCobro,
        descripcion: schema.servicios.descripcion,
      })
      .from(schema.servicios)
      .where(inArray(schema.servicios.id, ids)),
    db
      .select()
      .from(schema.servicioVariantes)
      .where(inArray(schema.servicioVariantes.servicioId, ids))
      .orderBy(asc(schema.servicioVariantes.orden)),
  ]);
  return ss.map((s) => ({
    tipo: "servicio" as const,
    id: s.id,
    nombre: s.nombre,
    lugar: s.destino ?? "",
    tipoServicio: s.tipo,
    modeloCobro: s.modeloCobro,
    notaCobro: s.notaCobro,
    descripcion: s.descripcion,
    variantes: variantes
      .filter((v) => v.servicioId === s.id)
      .map((v) => ({ id: v.id, nombre: v.nombre, pasajeros: v.pasajeros, maletas: v.maletas, detalle: v.detalle })),
  }));
}

export async function fichasAerolineas(ids: string[]): Promise<FichaArmador[]> {
  if (!ids.length) return [];
  const [as, tarifas] = await Promise.all([
    db.select().from(schema.aerolineas).where(inArray(schema.aerolineas.id, ids)),
    db
      .select()
      .from(schema.aerolineaTarifas)
      .where(inArray(schema.aerolineaTarifas.aerolineaId, ids))
      .orderBy(asc(schema.aerolineaTarifas.orden)),
  ]);
  return as.map((a) => ({
    tipo: "vuelo" as const,
    id: a.id,
    nombre: a.nombre,
    lugar: a.iata,
    iata: a.iata,
    tarifas: tarifas
      .filter((t) => t.aerolineaId === a.id)
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        detalle: textoTarifa({
          mano: { piezas: t.manoPiezas, kg: t.manoKg },
          documentado: { piezas: t.documentadoPiezas, kg: t.documentadoKg },
          articuloPersonal: t.articuloPersonal,
        }),
      })),
  }));
}

/** Tipos de unidad de traslado. Sin ids: todos, los archivados al final. */
export async function fichasTraslados(ids?: string[]): Promise<FichaArmador[]> {
  if (ids && !ids.length) return [];
  const t = schema.trasladoUnidades;
  const filas = await db
    .select()
    .from(t)
    .where(ids ? inArray(t.id, ids) : undefined)
    .orderBy(sql`${t.archivadoEn} is not null`, asc(t.pasajeros), asc(t.maletas), asc(t.nombre));
  return filas.map((u) => ({
    tipo: "traslado" as const,
    id: u.id,
    nombre: u.nombre,
    lugar: "",
    foto: u.foto ? urlFoto(u.foto, "c") : null,
    pasajeros: u.pasajeros,
    maletas: u.maletas,
    adaptada: u.adaptada,
    descripcion: u.descripcion,
    archivada: !!u.archivadoEn,
  }));
}

/** Las fichas de todo lo que usan estas partidas, por id. */
export async function fichasDe(
  partidas: {
    hotelId: string | null;
    actividadId: string | null;
    servicioId: string | null;
    aerolineaId: string | null;
    trasladoUnidadId: string | null;
  }[],
): Promise<Record<string, FichaArmador>> {
  const unicos = (k: "hotelId" | "actividadId" | "servicioId" | "aerolineaId" | "trasladoUnidadId") => [
    ...new Set(partidas.map((p) => p[k]).filter((x): x is string => !!x)),
  ];
  const listas = await Promise.all([
    fichasHoteles(unicos("hotelId")),
    fichasActividades(unicos("actividadId")),
    fichasServicios(unicos("servicioId")),
    fichasAerolineas(unicos("aerolineaId")),
    fichasTraslados(unicos("trasladoUnidadId")),
  ]);
  return Object.fromEntries(listas.flat().map((f) => [f.id, f]));
}

export async function fichaDe(tipo: TipoPartida, id: string): Promise<FichaArmador | null> {
  const f =
    tipo === "hotel"
      ? await fichasHoteles([id])
      : tipo === "actividad"
        ? await fichasActividades([id])
        : tipo === "servicio"
          ? await fichasServicios([id])
          : tipo === "traslado"
            ? await fichasTraslados([id])
            : await fichasAerolineas([id]);
  return f[0] ?? null;
}

// ─── Búsqueda en el catálogo ────────────────────────────────────────────────

/**
 * Busca por nombre en el catálogo de ese tipo. Sin texto, lo más usado en la
 * ciudad del viaje. Los archivados no aparecen.
 */
export async function buscarEnCatalogo(
  tipo: TipoPartida,
  texto: string,
  ciudadId: string,
): Promise<ResultadoCatalogo[]> {
  const q = `%${normalizar(texto)}%`;
  const conTexto = normalizar(texto).length > 0;
  const usos = (col: AnyPgColumn, id: AnyPgColumn) =>
    sql<number>`(select count(*)::int from ${schema.partidas} where ${col} = ${id})`;

  if (tipo === "hotel") {
    const filas = await db
      .select({
        id: schema.hoteles.id,
        nombre: schema.hoteles.nombre,
        lugar: ciudadTexto,
        ciudadId: schema.hoteles.ciudadId,
        usos: usos(schema.partidas.hotelId, schema.hoteles.id),
      })
      .from(schema.hoteles)
      .innerJoin(schema.ciudades, eq(schema.ciudades.id, schema.hoteles.ciudadId))
      .where(
        and(
          isNull(schema.hoteles.archivadoEn),
          isNull(schema.hoteles.unidoA),
          conTexto ? sql`${schema.hoteles.nombreBusqueda} like ${q}` : eq(schema.hoteles.ciudadId, ciudadId),
        ),
      )
      .orderBy(desc(sql`${schema.hoteles.ciudadId} = ${ciudadId}`), asc(schema.hoteles.nombre))
      .limit(8);
    return filas.map((f) => ({ ...f, sub: f.lugar }));
  }
  if (tipo === "actividad") {
    const filas = await db
      .select({
        id: schema.actividades.id,
        nombre: schema.actividades.nombre,
        lugar: ciudadTexto,
        ciudadId: schema.actividades.ciudadId,
        usos: usos(schema.partidas.actividadId, schema.actividades.id),
      })
      .from(schema.actividades)
      .innerJoin(schema.ciudades, eq(schema.ciudades.id, schema.actividades.ciudadId))
      .where(
        and(
          isNull(schema.actividades.archivadoEn),
          conTexto ? sql`${schema.actividades.nombreBusqueda} like ${q}` : sql`true`,
        ),
      )
      .orderBy(desc(sql`${schema.actividades.ciudadId} = ${ciudadId}`), asc(schema.actividades.nombre))
      .limit(8);
    return filas.map((f) => ({ ...f, sub: f.lugar }));
  }
  if (tipo === "servicio") {
    const filas = await db
      .select({
        id: schema.servicios.id,
        nombre: schema.servicios.nombre,
        lugar: sql<string>`coalesce(${schema.servicios.destino}, '')`,
        ciudadId: schema.servicios.ciudadId,
        usos: usos(schema.partidas.servicioId, schema.servicios.id),
      })
      .from(schema.servicios)
      .where(
        and(
          isNull(schema.servicios.archivadoEn),
          // Los traslados viejos de Servicios ya no se agregan: tienen su propio catálogo.
          sql`${schema.servicios.tipo} <> 'traslado'`,
          conTexto ? sql`${schema.servicios.nombreBusqueda} like ${q}` : sql`true`,
        ),
      )
      .orderBy(desc(usos(schema.partidas.servicioId, schema.servicios.id)), asc(schema.servicios.nombre))
      .limit(8);
    return filas.map((f) => ({ ...f, sub: f.lugar }));
  }
  if (tipo === "traslado") {
    const t = schema.trasladoUnidades;
    const filas = await db
      .select({
        id: t.id,
        nombre: t.nombre,
        pasajeros: t.pasajeros,
        maletas: t.maletas,
        usos: usos(schema.partidas.trasladoUnidadId, t.id),
      })
      .from(t)
      .where(and(isNull(t.archivadoEn), conTexto ? sql`${t.nombreBusqueda} like ${q}` : sql`true`))
      .orderBy(asc(t.pasajeros), asc(t.maletas), asc(t.nombre))
      .limit(12);
    return filas.map((f) => ({ id: f.id, nombre: f.nombre, sub: textoCapacidad(f), ciudadId: null, usos: f.usos }));
  }
  const filas = await db
    .select({
      id: schema.aerolineas.id,
      nombre: schema.aerolineas.nombre,
      lugar: schema.aerolineas.iata,
      ciudadId: sql<string | null>`null`,
      usos: usos(schema.partidas.aerolineaId, schema.aerolineas.id),
    })
    .from(schema.aerolineas)
    .where(
      and(
        isNull(schema.aerolineas.archivadoEn),
        conTexto
          ? sql`(lower(${schema.aerolineas.nombre}) like ${q} or lower(${schema.aerolineas.iata}) like ${q})`
          : sql`true`,
      ),
    )
    .orderBy(asc(schema.aerolineas.nombre))
    .limit(8);
  return filas.map((f) => ({ ...f, sub: f.lugar }));
}
