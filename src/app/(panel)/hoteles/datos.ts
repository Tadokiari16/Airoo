import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { historialDe, type Cambio } from "@/lib/bitacora";
import type { Encuadre } from "@/lib/fotos";
import { urlFoto } from "@/lib/imagenes";
import { horaCliente, revisarFicha, textoCargo, type Revision, type SeCobra } from "@/lib/hoteles";
import type { Moneda } from "@/lib/dinero";
import { formatoFechaCorta, formatoMesAnio } from "@/lib/fechas";
import { normalizar } from "@/lib/texto";

export type Foto = {
  id: string;
  url: string;
  miniatura: string;
  ancho: number;
  alto: number;
  encuadre: Encuadre | null;
};

export type Habitacion = {
  id: string;
  nombre: string;
  fotos: Foto[];
  nombres: { id: string; proveedorId: string; proveedor: string; nombre: string }[];
};

export type Cargo = {
  id: string;
  concepto: string;
  montoCentavos: number;
  moneda: Moneda;
  seCobra: SeCobra;
  texto: string;
};

export type DondeReservar = {
  id: string;
  proveedorId: string;
  proveedor: string;
  tipo: "plataforma" | "directo";
  idExterno: string | null;
};

export type Hotel = {
  id: string;
  nombre: string;
  ciudadId: string;
  ciudad: string;
  ciudadCompleta: string;
  regimenes: string[];
  descripcion: string | null;
  direccion: string | null;
  ligaMaps: string | null;
  telefonoPublico: string | null;
  tripadvisorId: string | null;
  tripadvisorCalificacion: number | null;
  tripadvisorOpiniones: number | null;
  tripadvisorActualizado: string | null;
  llegadaDesde: string | null;
  salidaHasta: string | null;
  llegada: string;
  salida: string;
  edadMenoresDe: number | null;
  edadMenoresA: number | null;
  llegadaAnticipada: string | null;
  reglas: string | null;
  telefonoReservaciones: string | null;
  correoReservaciones: string | null;
  notaInterna: string | null;
  sinCargos: boolean;
  archivado: boolean;
  motivoArchivo: string | null;
  unidoA: string | null;
  portada: Foto | null;
  galeria: Foto[];
  habitaciones: Habitacion[];
  cargos: Cargo[];
  dondeReservar: DondeReservar[];
  revision: Revision[];
  minima: boolean;
  viajes: number;
  desde: string;
  editada: string;
  busqueda: string;
};

const aHora = (t: string | null) => (t ? t.slice(0, 5) : null);

/** Hoteles con todo lo de su ficha. Son pocos; la lista y la ficha usan lo mismo. */
export async function cargarHoteles(soloId?: string): Promise<Hotel[]> {
  const h = schema.hoteles;
  const filas = await db
    .select({
      h,
      ciudad: schema.ciudades.nombre,
      region: schema.ciudades.region,
      pais: schema.ciudades.pais,
      editor: schema.usuarios.nombre,
    })
    .from(h)
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, h.ciudadId))
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, h.creadoPor))
    .where(soloId ? eq(h.id, soloId) : isNull(h.unidoA))
    .orderBy(asc(h.nombreBusqueda));
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.h.id);

  const [fotos, habitaciones, nombres, cargos, donde] = await Promise.all([
    db
      .select()
      .from(schema.fotos)
      .where(inArray(schema.fotos.hotelId, ids))
      .orderBy(asc(schema.fotos.orden), asc(schema.fotos.creadoEn)),
    db
      .select()
      .from(schema.hotelHabitaciones)
      .where(inArray(schema.hotelHabitaciones.hotelId, ids))
      .orderBy(asc(schema.hotelHabitaciones.orden), asc(schema.hotelHabitaciones.creadoEn)),
    db
      .select({ n: schema.hotelHabitacionNombres, proveedor: schema.proveedores.nombre })
      .from(schema.hotelHabitacionNombres)
      .innerJoin(schema.proveedores, eq(schema.proveedores.id, schema.hotelHabitacionNombres.proveedorId))
      .innerJoin(
        schema.hotelHabitaciones,
        eq(schema.hotelHabitaciones.id, schema.hotelHabitacionNombres.habitacionId),
      )
      .where(inArray(schema.hotelHabitaciones.hotelId, ids))
      .orderBy(asc(schema.proveedores.nombre)),
    db
      .select()
      .from(schema.hotelCargos)
      .where(inArray(schema.hotelCargos.hotelId, ids))
      .orderBy(asc(schema.hotelCargos.orden)),
    db
      .select({
        d: schema.hotelProveedores,
        nombre: schema.proveedores.nombre,
        tipo: schema.proveedores.tipo,
      })
      .from(schema.hotelProveedores)
      .innerJoin(schema.proveedores, eq(schema.proveedores.id, schema.hotelProveedores.proveedorId))
      .where(inArray(schema.hotelProveedores.hotelId, ids))
      .orderBy(sql`${schema.proveedores.tipo} = 'directo'`, asc(schema.proveedores.nombre)),
  ]);

  const aFoto = (f: (typeof fotos)[number]): Foto => ({
    id: f.id,
    url: urlFoto(f.archivo, "g"),
    miniatura: urlFoto(f.archivo, "c"),
    ancho: f.ancho,
    alto: f.alto,
    encuadre: (f.encuadre as Encuadre | null) ?? null,
  });

  return filas.map(({ h: x, ciudad, region, pais, editor }) => {
    const suyas = fotos.filter((f) => f.hotelId === x.id);
    const portada = suyas.find((f) => f.esPortada && !f.habitacionId);
    const galeria = suyas.filter((f) => !f.habitacionId && !f.esPortada).map(aFoto);
    const habs: Habitacion[] = habitaciones
      .filter((r) => r.hotelId === x.id)
      .map((r) => ({
        id: r.id,
        nombre: r.nombreCliente,
        fotos: suyas.filter((f) => f.habitacionId === r.id).map(aFoto),
        nombres: nombres
          .filter((n) => n.n.habitacionId === r.id)
          .map((n) => ({
            id: n.n.id,
            proveedorId: n.n.proveedorId,
            proveedor: n.proveedor,
            nombre: n.n.nombre,
          })),
      }));
    const susCargos: Cargo[] = cargos
      .filter((c) => c.hotelId === x.id)
      .map((c) => ({
        id: c.id,
        concepto: c.concepto,
        montoCentavos: c.montoCentavos,
        moneda: c.moneda,
        seCobra: c.seCobra,
        texto: textoCargo(c),
      }));
    const susDonde: DondeReservar[] = donde
      .filter((d) => d.d.hotelId === x.id)
      .map((d) => ({
        id: d.d.id,
        proveedorId: d.d.proveedorId,
        proveedor: d.nombre,
        tipo: d.tipo,
        idExterno: d.d.idExterno,
      }));
    const revision = revisarFicha({
      portada: portada ? { ancho: portada.ancho, alto: portada.alto } : null,
      fotosGaleria: galeria.length,
      descripcion: x.descripcion,
      direccion: x.direccion,
      ligaMaps: x.ligaMaps,
      habitaciones: habs.map((r) => ({ fotos: r.fotos.length, nombres: r.nombres.length })),
      tripadvisorId: x.tripadvisorId,
      tripadvisorCalificacion: x.tripadvisorCalificacion,
      cargos: susCargos.length,
      sinCargos: x.sinCargos,
      telefonoReservaciones: x.telefonoReservaciones,
      correoReservaciones: x.correoReservaciones,
    });
    return {
      id: x.id,
      nombre: x.nombre,
      ciudadId: x.ciudadId,
      ciudad: `${ciudad}, ${pais}`,
      ciudadCompleta: `${ciudad}, ${region}, ${pais}`,
      regimenes: x.regimenes,
      descripcion: x.descripcion,
      direccion: x.direccion,
      ligaMaps: x.ligaMaps,
      telefonoPublico: x.telefonoPublico,
      tripadvisorId: x.tripadvisorId,
      tripadvisorCalificacion: x.tripadvisorCalificacion,
      tripadvisorOpiniones: x.tripadvisorOpiniones,
      tripadvisorActualizado: x.tripadvisorActualizadoEn
        ? formatoFechaCorta(x.tripadvisorActualizadoEn)
        : null,
      llegadaDesde: aHora(x.llegadaDesde),
      salidaHasta: aHora(x.salidaHasta),
      llegada: horaCliente(x.llegadaDesde),
      salida: horaCliente(x.salidaHasta),
      edadMenoresDe: x.edadMenoresDe,
      edadMenoresA: x.edadMenoresA,
      llegadaAnticipada: x.llegadaAnticipada,
      reglas: x.reglas,
      telefonoReservaciones: x.telefonoReservaciones,
      correoReservaciones: x.correoReservaciones,
      notaInterna: x.notaInterna,
      sinCargos: x.sinCargos,
      archivado: !!x.archivadoEn,
      motivoArchivo: x.motivoArchivo,
      unidoA: x.unidoA,
      portada: portada ? aFoto(portada) : null,
      galeria,
      habitaciones: habs,
      cargos: susCargos,
      dondeReservar: susDonde,
      revision,
      minima: !portada && galeria.length === 0 && !x.descripcion && habs.length === 0,
      // Los viajes llegan en la Fase 2 (partidas de las cotizaciones).
      viajes: 0,
      desde: formatoMesAnio(x.creadoEn),
      editada: `${editor ?? "El equipo"} · ${formatoFechaCorta(x.actualizadoEn)}`,
      busqueda: normalizar(
        [
          x.nombre,
          ciudad,
          region,
          ...susDonde.map((d) => d.idExterno ?? ""),
          ...susDonde.map((d) => d.proveedor),
        ].join(" "),
      ),
    };
  });
}

export async function cargarHotel(id: string): Promise<Hotel | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [h] = await cargarHoteles(id);
  return h ?? null;
}

export type { OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import type { OpcionCiudad } from "@/components/catalogo/elegir-ciudad";

export async function opcionesCiudad(): Promise<OpcionCiudad[]> {
  const filas = await db
    .select()
    .from(schema.ciudades)
    .where(isNull(schema.ciudades.archivadoEn))
    .orderBy(asc(schema.ciudades.nombreBusqueda));
  return filas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    detalle: `${c.region}, ${c.pais}`,
    busqueda: normalizar(`${c.nombre} ${c.region} ${c.pais}`),
  }));
}

export type OpcionProveedor = { id: string; nombre: string; tipo: "plataforma" | "directo" };

export async function opcionesProveedor(): Promise<OpcionProveedor[]> {
  return db
    .select({ id: schema.proveedores.id, nombre: schema.proveedores.nombre, tipo: schema.proveedores.tipo })
    .from(schema.proveedores)
    .where(isNull(schema.proveedores.archivadoEn))
    .orderBy(asc(schema.proveedores.nombreBusqueda));
}

export type { Cambio };

/** «Ver historial de cambios»: lo que la bitácora tiene de este hotel. */
export const historialHotel = (id: string) => historialDe("hoteles", id);

/** Para «Unir con otro hotel»: los demás hoteles que no se han unido. */
export async function otrosHoteles(sinId: string) {
  const h = schema.hoteles;
  return db
    .select({ id: h.id, nombre: h.nombre, ciudad: schema.ciudades.nombre })
    .from(h)
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, h.ciudadId))
    .where(and(isNull(h.unidoA), sql`${h.id} <> ${sinId}`))
    .orderBy(asc(h.nombreBusqueda));
}

export type HotelParecido = { id: string; nombre: string; ciudad: string; archivado: boolean };

/** Hoteles con nombre parecido, para avisar antes de crear un duplicado. */
export async function hotelesParecidos(nombre: string, sinId?: string): Promise<HotelParecido[]> {
  const n = normalizar(nombre);
  const h = schema.hoteles;
  const filas = await db
    .select({ id: h.id, nombre: h.nombre, ciudad: schema.ciudades.nombre, archivadoEn: h.archivadoEn })
    .from(h)
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, h.ciudadId))
    .where(
      sql`(${h.nombreBusqueda} = ${n}
        or ${h.nombreBusqueda} like ${n + "%"}
        or ${n} like ${h.nombreBusqueda} || '%'
        or extensions.similarity(${h.nombreBusqueda}, ${n}) >= 0.45)
        and ${h.unidoA} is null
        and ${h.id}::text <> ${sinId ?? ""}`,
    )
    .orderBy(sql`extensions.similarity(${h.nombreBusqueda}, ${n}) desc`)
    .limit(4);
  return filas.map((f) => ({ id: f.id, nombre: f.nombre, ciudad: f.ciudad, archivado: !!f.archivadoEn }));
}
