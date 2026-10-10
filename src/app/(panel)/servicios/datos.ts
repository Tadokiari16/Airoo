import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { viajesPorRegistro } from "@/lib/catalogos";
import { historialDe } from "@/lib/bitacora";
import {
  queSePide,
  revisarServicio,
  type ModeloCobro,
  type RevisionServicio,
  type TipoServicio,
} from "@/lib/servicios";
import { formatoFechaCorta, formatoMesAnio } from "@/lib/fechas";
import { normalizar } from "@/lib/texto";
import type { Ligado } from "../actividades/datos";

export { opcionesCiudad, opcionesProveedor, type OpcionCiudad, type OpcionProveedor } from "../hoteles/datos";
export type { Ligado };

export type Variante = {
  id: string;
  nombre: string;
  pasajeros: number | null;
  maletas: number | null;
  detalle: string | null;
};

export type Servicio = {
  id: string;
  nombre: string;
  tipo: TipoServicio;
  destino: string;
  ciudadId: string | null;
  ciudad: string | null;
  modeloCobro: ModeloCobro;
  notaCobro: string | null;
  descripcion: string | null;
  clienteRecibe: string | null;
  enViajeConfirmado: string | null;
  notaInterna: string | null;
  variaPorReserva: boolean;
  variantes: Variante[];
  ligados: Ligado[];
  revision: RevisionServicio[];
  pide: string[];
  archivado: boolean;
  motivoArchivo: string | null;
  // Los viajes llegan en la Fase 2 (partidas de las cotizaciones).
  viajes: number;
  desde: string;
  editado: string;
  busqueda: string;
};

const PARA_QUE: Record<string, string> = {
  reservas: "Reservas",
  ventas: "Ventas",
  pagos: "Pagos",
  emergencias: "Emergencias",
};

/** Servicios con todo lo de su ficha. Son pocos; la lista y la ficha usan lo mismo. */
export async function cargarServicios(soloId?: string): Promise<Servicio[]> {
  const s = schema.servicios;
  const filas = await db
    .select({
      s,
      ciudad: schema.ciudades.nombre,
      pais: schema.ciudades.pais,
      editor: schema.usuarios.nombre,
    })
    .from(s)
    .leftJoin(schema.ciudades, eq(schema.ciudades.id, s.ciudadId))
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, s.creadoPor))
    .where(soloId ? eq(s.id, soloId) : undefined)
    .orderBy(asc(s.nombreBusqueda));
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.s.id);

  const usadoEnViajes = await viajesPorRegistro("servicioId");
  const [variantes, ligas, contactos] = await Promise.all([
    db
      .select()
      .from(schema.servicioVariantes)
      .where(inArray(schema.servicioVariantes.servicioId, ids))
      .orderBy(asc(schema.servicioVariantes.orden)),
    db
      .select({
        l: schema.servicioProveedores,
        nombre: schema.proveedores.nombre,
        tipo: schema.proveedores.tipo,
      })
      .from(schema.servicioProveedores)
      .innerJoin(schema.proveedores, eq(schema.proveedores.id, schema.servicioProveedores.proveedorId))
      .where(inArray(schema.servicioProveedores.servicioId, ids))
      .orderBy(sql`${schema.proveedores.tipo} = 'directo'`, asc(schema.proveedores.nombre)),
    db
      .select({ c: schema.proveedorContactos })
      .from(schema.proveedorContactos)
      .innerJoin(
        schema.servicioProveedores,
        eq(schema.servicioProveedores.proveedorId, schema.proveedorContactos.proveedorId),
      )
      .where(inArray(schema.servicioProveedores.servicioId, ids))
      .orderBy(
        sql`${schema.proveedorContactos.principal} desc`,
        sql`${schema.proveedorContactos.paraQue} = 'reservas' desc`,
        asc(schema.proveedorContactos.creadoEn),
      ),
  ]);

  return filas.map(({ s: x, ciudad, pais, editor }) => {
    const susVariantes = variantes
      .filter((v) => v.servicioId === x.id)
      .map((v) => ({
        id: v.id,
        nombre: v.nombre,
        pasajeros: v.pasajeros,
        maletas: v.maletas,
        detalle: v.detalle,
      }));
    const ligados: Ligado[] = x.variaPorReserva
      ? []
      : ligas
          .filter((l) => l.l.servicioId === x.id)
          .map((l) => {
            const c = contactos.find((c) => c.c.proveedorId === l.l.proveedorId)?.c;
            return {
              id: l.l.id,
              proveedorId: l.l.proveedorId,
              proveedor: l.nombre,
              tipo: l.tipo,
              idExterno: l.l.idExterno,
              contacto: c
                ? { nombre: c.nombre, paraQue: PARA_QUE[c.paraQue], whatsapp: c.whatsapp, correo: c.correo }
                : null,
            };
          });
    return {
      id: x.id,
      nombre: x.nombre,
      tipo: x.tipo,
      destino: x.destino ?? (ciudad ? `${ciudad}, ${pais}` : "Cualquier destino"),
      ciudadId: x.ciudadId,
      ciudad: ciudad ? `${ciudad}, ${pais}` : null,
      modeloCobro: x.modeloCobro,
      notaCobro: x.notaCobro,
      descripcion: x.descripcion,
      clienteRecibe: x.clienteRecibe,
      enViajeConfirmado: x.enViajeConfirmado,
      notaInterna: x.notaInterna,
      variaPorReserva: x.variaPorReserva,
      variantes: susVariantes,
      ligados,
      revision: revisarServicio({
        tipo: x.tipo,
        modeloCobro: x.modeloCobro,
        descripcion: x.descripcion,
        clienteRecibe: x.clienteRecibe,
        variantes: susVariantes.length,
        proveedores: ligados.length,
        variaPorReserva: x.variaPorReserva,
      }),
      pide: queSePide({ tipo: x.tipo, modeloCobro: x.modeloCobro, variantes: susVariantes.length }),
      archivado: !!x.archivadoEn,
      motivoArchivo: x.motivoArchivo,
      viajes: usadoEnViajes.get(x.id) ?? 0,
      desde: formatoMesAnio(x.creadoEn),
      editado: `${editor ?? "El equipo"} · ${formatoFechaCorta(x.actualizadoEn)}`,
      busqueda: normalizar(
        [
          x.nombre,
          x.destino ?? "",
          ciudad ?? "",
          ...susVariantes.map((v) => v.nombre),
          ...ligados.map((l) => `${l.idExterno ?? ""} ${l.proveedor}`),
        ].join(" "),
      ),
    };
  });
}

export async function cargarServicio(id: string): Promise<Servicio | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [s] = await cargarServicios(id);
  return s ?? null;
}

export const historialServicio = (id: string) => historialDe("servicios", id);

export type ServicioParecido = { id: string; nombre: string; destino: string; archivado: boolean };

/** Servicios con nombre parecido, para avisar antes de crear un duplicado. */
export async function serviciosParecidos(nombre: string): Promise<ServicioParecido[]> {
  const n = normalizar(nombre);
  const s = schema.servicios;
  const filas = await db
    .select({ id: s.id, nombre: s.nombre, destino: s.destino, archivadoEn: s.archivadoEn })
    .from(s)
    .where(
      and(
        sql`(${s.nombreBusqueda} = ${n}
          or ${s.nombreBusqueda} like ${n + "%"}
          or ${n} like ${s.nombreBusqueda} || '%'
          or extensions.similarity(${s.nombreBusqueda}, ${n}) >= 0.45)`,
      ),
    )
    .orderBy(sql`extensions.similarity(${s.nombreBusqueda}, ${n}) desc`)
    .limit(4);
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    destino: f.destino ?? "Cualquier destino",
    archivado: !!f.archivadoEn,
  }));
}
