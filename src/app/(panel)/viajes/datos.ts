import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { fichasDe, type FichaArmador } from "@/lib/catalogo-armador";
import { idCatalogo } from "@/lib/armador-fichas";
import { calcular, type Opcion, type PartidaArmador } from "@/lib/armador";
import { lineasPartida, nombreCorto, nombrePartida, SECCIONES, type ClaveSeccion } from "@/lib/armador-textos";
import { comision, noches, type Totales } from "@/lib/cotizacion";
import { formatoDinero } from "@/lib/dinero";
import { situacion, type Situacion, type Etapa, folioTexto, textoPersonas } from "@/lib/etapas";
import { haceCuanto, rangoCorto } from "@/lib/fechas";
import { puedeEditarViaje, puedeVerCostos, puede } from "@/lib/permisos";
import type { Usuario } from "@/lib/sesion";
import { normalizar } from "@/lib/texto";
import {
  cotizacionesActuales,
  eventosDe,
  fixDe,
  opcionesDe,
  partidasDe,
  totalesPorOpcion,
  type Cotizacion,
} from "@/lib/viajes";
import { cargarAjustes } from "../configuracion/datos";

const salida = alias(schema.ciudades, "salida");

const viajeBase = () =>
  db
    .select({
      v: schema.viajes,
      cliente: schema.clientes.nombre,
      clienteWhatsapp: schema.clientes.whatsapp,
      destino: schema.ciudades.nombre,
      salida: salida.nombre,
      aCargoNombre: schema.usuarios.nombre,
      aCargoIniciales: schema.usuarios.iniciales,
      aCargoRol: schema.usuarios.rol,
    })
    .from(schema.viajes)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.viajes.clienteId))
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, schema.viajes.ciudadDestinoId))
    .leftJoin(salida, eq(salida.id, schema.viajes.ciudadSalidaId))
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.viajes.aCargo));

type FilaBase = Awaited<ReturnType<typeof viajeBase>>[number];

export type ACargo = { id: string; nombre: string; iniciales: string; esYo: boolean } | null;

const aCargoDe = (f: FilaBase, yo: Usuario): ACargo =>
  f.v.aCargo
    ? {
        id: f.v.aCargo,
        nombre: f.v.aCargo === yo.id ? "Tú" : (f.aCargoNombre ?? ""),
        iniciales: f.v.aCargo === yo.id ? "TÚ" : (f.aCargoIniciales ?? ""),
        esYo: f.v.aCargo === yo.id,
      }
    : null;

/** Inversión de la lista: «$42,248» o «Desde $27,300 · 2 opciones». */
function inversion(porOpcion: { totales: Totales }[]): { monto: string | null; sub: string | null } {
  const completos = porOpcion.filter((o) => o.totales.completo && o.totales.total > 0).map((o) => o.totales.total);
  const pesos = (c: number) => formatoDinero(Math.round(c / 100) * 100);
  if (porOpcion.length > 1)
    return {
      monto: completos.length ? `Desde ${pesos(Math.min(...completos))}` : null,
      sub: `${porOpcion.length} opciones`,
    };
  return { monto: completos.length ? pesos(completos[0]) : null, sub: completos.length ? null : "Por cotizar" };
}

// ─── Lista ──────────────────────────────────────────────────────────────────

export type FilaViaje = {
  id: string;
  folio: number;
  folioTexto: string;
  cliente: string;
  whatsapp: string | null;
  destino: string;
  personas: string;
  fechas: string;
  noches: string;
  etapa: Etapa;
  situacion: Situacion;
  inversion: { monto: string | null; sub: string | null };
  ultima: { texto: string; cuando: string; etiqueta: string | null } | null;
  actividad: { id: string; texto: string; cuando: string; etiqueta: string | null }[];
  nota: { texto: string; quien: string | null; cuando: string } | null;
  aCargo: ACargo;
  servicios: { tipo: string; nombre: string; detalle: string }[];
  ejemplo: boolean;
  busqueda: string;
};

export async function cargarViajes(yo: Usuario): Promise<FilaViaje[]> {
  const filas = await viajeBase().orderBy(asc(schema.viajes.inicio));
  const ids = filas.map((f) => f.v.id);
  const cotizaciones = await cotizacionesActuales(ids);
  const cotIds = [...cotizaciones.values()].map((c) => c.id);
  const [partidas, opciones, eventos] = await Promise.all([
    partidasDe(cotIds),
    opcionesDe(cotIds),
    ids.length
      ? db
          .select({ e: schema.viajeEventos, quien: schema.usuarios.nombre })
          .from(schema.viajeEventos)
          .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.viajeEventos.quien))
          .where(inArray(schema.viajeEventos.viajeId, ids))
          .orderBy(desc(schema.viajeEventos.creadoEn))
      : Promise.resolve([]),
  ]);
  const fichas = await fichasDe([...partidas.values()].flat());
  const ahora = new Date();

  return filas.map((f) => {
    const c = cotizaciones.get(f.v.id)!;
    const ps = partidas.get(c.id) ?? [];
    const ops = opciones.get(c.id) ?? [];
    const personas = f.v.adultos + f.v.menores;
    const suyos = eventos.filter((e) => e.e.viajeId === f.v.id);
    const actividad = suyos.filter((e) => e.e.tipo !== "nota");
    const nota = suyos.find((e) => e.e.tipo === "nota");
    return {
      id: f.v.id,
      folio: f.v.folio,
      folioTexto: folioTexto(f.v.folio),
      cliente: f.cliente,
      whatsapp: f.clienteWhatsapp,
      destino: f.destino,
      personas: textoPersonas(personas),
      fechas: rangoCorto(f.v.inicio, f.v.fin),
      noches: `${noches(f.v.inicio, f.v.fin)} noches`,
      etapa: f.v.etapa,
      situacion: situacion(f.v.etapa, c.estado),
      inversion: inversion(totalesPorOpcion(c, ps, ops, personas)),
      ultima: actividad[0]
        ? {
            texto: actividad[0].e.texto,
            cuando: haceCuanto(actividad[0].e.creadoEn, ahora),
            etiqueta: actividad[0].e.etiqueta,
          }
        : null,
      actividad: actividad.slice(0, 5).map((e) => ({
        id: e.e.id,
        texto: e.e.texto,
        cuando: haceCuanto(e.e.creadoEn, ahora),
        etiqueta: e.e.etiqueta,
      })),
      nota: nota ? { texto: nota.e.texto, quien: nota.quien, cuando: haceCuanto(nota.e.creadoEn, ahora) } : null,
      aCargo: aCargoDe(f, yo),
      servicios: ps.map((p) => {
        const ficha = fichas[idCatalogo(p) ?? ""];
        return { tipo: p.tipo, nombre: nombrePartida(p, ficha), detalle: lineasPartida(p, ficha)[0] ?? "" };
      }),
      ejemplo: f.v.ejemplo,
      busqueda: normalizar(`${f.cliente} ${f.v.folio} AIR-${f.v.folio} ${f.destino}`),
    };
  });
}

// ─── Un viaje ───────────────────────────────────────────────────────────────

export type ItemResumen = {
  id: string;
  tipo: PartidaArmador["tipo"];
  nombre: string;
  lineas: string[];
  /** Precio al cliente; null si falta el costo neto. */
  precio: number | null;
  proveedor: string | null;
  opcion: string | null;
  recomendada: boolean;
};

export type Dinero = {
  con: string | null;
  venta: number;
  proveedores: number;
  utilidad: number;
  utilidadPb: number;
  completo: boolean;
  comision: { porcentaje: number; airoo: number; asesora: number } | null;
};

export type ViajeCompleto = {
  id: string;
  folio: number;
  folioTexto: string;
  cliente: string;
  clienteNombre: string;
  whatsapp: string | null;
  destino: string;
  salida: string | null;
  inicio: string;
  fin: string;
  adultos: number;
  menores: number;
  edadesMenores: number[];
  etapa: Etapa;
  situacion: Situacion;
  ejemplo: boolean;
  aCargo: ACargo;
  cotizacion: { id: string; version: number; estado: Cotizacion["estado"]; opciones: number; validaHasta: string | null };
  secciones: { clave: ClaveSeccion; titulo: string; items: ItemResumen[] }[];
  total: number | null;
  totalCon: string | null;
  dinero: Dinero | null;
  actividad: { id: string; texto: string; cuando: string; etiqueta: string | null; tipo: string; quien: string | null }[];
  puedeEditar: boolean;
  puedeReasignar: boolean;
  equipo: { id: string; nombre: string }[];
};

export async function cargarViaje(folio: number, yo: Usuario): Promise<ViajeCompleto | null> {
  const [f] = await viajeBase().where(eq(schema.viajes.folio, folio)).limit(1);
  if (!f) return null;
  const c = (await cotizacionesActuales([f.v.id])).get(f.v.id)!;
  const [partidas, opciones, eventos, ajustes] = await Promise.all([
    partidasDe([c.id]).then((m) => m.get(c.id) ?? []),
    opcionesDe([c.id]).then((m) => m.get(c.id) ?? []),
    eventosDe(f.v.id),
    cargarAjustes(),
  ]);
  const fichas = await fichasDe(partidas);
  const provIds = [...new Set(partidas.map((p) => p.proveedorId).filter((x): x is string => !!x))];
  const provs = provIds.length
    ? await db
        .select({ id: schema.proveedores.id, nombre: schema.proveedores.nombre })
        .from(schema.proveedores)
        .where(inArray(schema.proveedores.id, provIds))
    : [];
  const personas = f.v.adultos + f.v.menores;
  const verCostos = puedeVerCostos(yo.rol, yo.id, f.v.aCargo);
  const fx = fixDe(c);

  const nombreOpcion = (o: Opcion | undefined) => {
    if (!o) return null;
    const hotel = partidas.find((p) => p.opcionId === o.id && p.tipo === "hotel");
    return hotel ? nombreCorto(hotel, fichas[hotel.hotelId ?? ""]) : `Opción ${o.orden + 1}`;
  };

  const secciones = SECCIONES.map((s) => ({
    clave: s.clave,
    titulo: s.titulo,
    items: partidas
      .filter((p) => (s.tipos as readonly string[]).includes(p.tipo))
      .map((p): ItemResumen => {
        const ficha: FichaArmador | undefined = fichas[idCatalogo(p) ?? ""];
        const o = opciones.find((x) => x.id === p.opcionId);
        return {
          id: p.id,
          tipo: p.tipo,
          nombre: nombrePartida(p, ficha),
          lineas: lineasPartida(p, ficha),
          precio: calcular(p, fx).precio,
          proveedor:
            provs.find((x) => x.id === p.proveedorId)?.nombre ??
            (p.tipo === "vuelo" && ficha ? ficha.nombre : p.pagoProveedor === "en_el_lugar" ? "Se paga en el lugar" : null),
          opcion: o ? `Opción ${o.orden + 1}` : null,
          recomendada: !!o?.recomendada,
        };
      }),
  })).filter((s) => s.items.length > 0);

  // Dinero y total: la opción elegida, la recomendada o la primera.
  const porOpcion = totalesPorOpcion(c, partidas, opciones, personas);
  const elegida =
    porOpcion.find((o) => o.opcionId === c.opcionElegidaId) ??
    porOpcion.find((o) => opciones.find((x) => x.id === o.opcionId)?.recomendada) ??
    porOpcion[0];
  const t = elegida.totales;
  const con = opciones.length ? nombreOpcion(opciones.find((o) => o.id === elegida.opcionId)) : null;
  const esDeAsesora = f.aCargoRol === "asesora";
  const pct = ajustes.comision_airoo.porcentaje_de_utilidad;

  const equipo = puede(yo.rol, "editar_todos_los_viajes")
    ? await db
        .select({ id: schema.usuarios.id, nombre: schema.usuarios.nombre })
        .from(schema.usuarios)
        .where(and(eq(schema.usuarios.activo, true), ne(schema.usuarios.rol, "contador")))
        .orderBy(asc(schema.usuarios.nombre))
    : [];

  return {
    id: f.v.id,
    folio: f.v.folio,
    folioTexto: folioTexto(f.v.folio),
    cliente: f.cliente,
    clienteNombre: f.cliente.split(/\s+/)[0],
    whatsapp: f.clienteWhatsapp,
    destino: f.destino,
    salida: f.salida,
    inicio: f.v.inicio,
    fin: f.v.fin,
    adultos: f.v.adultos,
    menores: f.v.menores,
    edadesMenores: f.v.edadesMenores,
    etapa: f.v.etapa,
    situacion: situacion(f.v.etapa, c.estado),
    ejemplo: f.v.ejemplo,
    aCargo: aCargoDe(f, yo),
    cotizacion: {
      id: c.id,
      version: c.version,
      estado: c.estado,
      opciones: opciones.length,
      validaHasta: c.validaHasta,
    },
    secciones,
    total: t.completo && t.total > 0 ? t.total : null,
    totalCon: con,
    dinero: verCostos
      ? {
          con,
          venta: t.total,
          proveedores: t.costo,
          utilidad: t.ganancia,
          utilidadPb: t.gananciaPb,
          completo: t.completo,
          comision: esDeAsesora ? { porcentaje: pct, ...comision(t.ganancia, pct) } : null,
        }
      : null,
    actividad: eventos.map((e) => ({
      id: e.id,
      texto: e.texto,
      cuando: haceCuanto(e.creadoEn),
      etiqueta: e.etiqueta,
      tipo: e.tipo,
      quien: e.quien,
    })),
    puedeEditar: puedeEditarViaje(yo.rol, yo.id, f.v.aCargo),
    puedeReasignar: puede(yo.rol, "editar_todos_los_viajes"),
    equipo,
  };
}

// ─── Nuevo viaje ────────────────────────────────────────────────────────────

export type ClienteOpcion = { id: string; nombre: string; whatsapp: string | null; viajes: number };

export async function buscarClientes(texto: string): Promise<ClienteOpcion[]> {
  const q = normalizar(texto);
  const digitos = texto.replace(/\D/g, "");
  if (q.length < 2 && digitos.length < 4) return [];
  const filas = await db
    .select({
      id: schema.clientes.id,
      nombre: schema.clientes.nombre,
      whatsapp: schema.clientes.whatsapp,
      viajes: sql<number>`(select count(*)::int from ${schema.viajes} where ${schema.viajes.clienteId} = ${schema.clientes.id})`,
    })
    .from(schema.clientes)
    .where(
      digitos.length >= 4
        ? sql`regexp_replace(coalesce(${schema.clientes.whatsapp}, ''), '\\D', '', 'g') like ${`%${digitos}%`}`
        : sql`${schema.clientes.nombreBusqueda} like ${`%${q}%`}`,
    )
    .orderBy(asc(schema.clientes.nombre))
    .limit(6);
  return filas;
}

export async function opcionesNuevoViaje() {
  const [ciudades, equipo] = await Promise.all([
    db
      .select({
        id: schema.ciudades.id,
        nombre: schema.ciudades.nombre,
        detalle: sql<string>`${schema.ciudades.region} || ', ' || ${schema.ciudades.pais}`,
        busqueda: schema.ciudades.nombreBusqueda,
      })
      .from(schema.ciudades)
      .where(isNull(schema.ciudades.archivadoEn))
      .orderBy(asc(schema.ciudades.nombre)),
    db
      .select({ id: schema.usuarios.id, nombre: schema.usuarios.nombre })
      .from(schema.usuarios)
      .where(and(eq(schema.usuarios.activo, true), ne(schema.usuarios.rol, "contador")))
      .orderBy(asc(schema.usuarios.nombre)),
  ]);
  return { ciudades, equipo };
}
