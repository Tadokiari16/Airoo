"use server";

import { asc, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { folioTexto } from "@/lib/etapas";
import { rangoCorto } from "@/lib/fechas";
import { puede } from "@/lib/permisos";
import { usuarioActual } from "@/lib/sesion";
import { normalizar } from "@/lib/texto";

export type ResultadoBusqueda = { folio: number; titulo: string; sub: string };

/** El buscador de arriba: viajes por cliente, folio o destino. Las claves de confirmación llegan con las reservas. */
export async function buscarViajes(texto: string): Promise<ResultadoBusqueda[]> {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_viajes")) return [];
  const q = normalizar(texto);
  if (q.length < 2) return [];
  const numero = Number(q.replace(/^air-?/, ""));
  const filas = await db
    .select({
      folio: schema.viajes.folio,
      cliente: schema.clientes.nombre,
      destino: schema.ciudades.nombre,
      inicio: schema.viajes.inicio,
      fin: schema.viajes.fin,
    })
    .from(schema.viajes)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.viajes.clienteId))
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, schema.viajes.ciudadDestinoId))
    .where(
      or(
        sql`${schema.clientes.nombreBusqueda} like ${`%${q}%`}`,
        sql`${schema.ciudades.nombreBusqueda} like ${`%${q}%`}`,
        Number.isInteger(numero) && numero > 0 ? eq(schema.viajes.folio, numero) : sql`false`,
      ),
    )
    .orderBy(asc(schema.viajes.inicio))
    .limit(8);
  return filas.map((f) => ({
    folio: f.folio,
    titulo: f.cliente,
    sub: `${folioTexto(f.folio)} · ${f.destino} · ${rangoCorto(f.inicio, f.fin)}`,
  }));
}
