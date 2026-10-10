import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { normalizar } from "@/lib/texto";

export type Parecida = { id: string; nombre: string; region: string; pais: string; archivada: boolean };

/**
 * Ciudades con nombre parecido: mismo nombre sin acentos, uno contiene al otro
 * o similitud de trigramas ≥ 0.4 («San Cristóbal» y «San Cristóbal de las Casas»).
 */
export async function buscarParecidas(nombre: string): Promise<Parecida[]> {
  const n = normalizar(nombre);
  const filas = await db
    .select({
      id: schema.ciudades.id,
      nombre: schema.ciudades.nombre,
      region: schema.ciudades.region,
      pais: schema.ciudades.pais,
      archivadoEn: schema.ciudades.archivadoEn,
    })
    .from(schema.ciudades)
    .where(
      sql`${schema.ciudades.nombreBusqueda} = ${n}
        or ${schema.ciudades.nombreBusqueda} like ${n + "%"}
        or ${n} like ${schema.ciudades.nombreBusqueda} || '%'
        or extensions.similarity(${schema.ciudades.nombreBusqueda}, ${n}) >= 0.4`,
    )
    .orderBy(sql`extensions.similarity(${schema.ciudades.nombreBusqueda}, ${n}) desc`)
    .limit(5);
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    region: f.region,
    pais: f.pais,
    archivada: !!f.archivadoEn,
  }));
}

/**
 * Cuántas veces se usa una ciudad. En la Fase 0 nada la usa todavía; en la
 * Fase 1 se suman hoteles, actividades y servicios, y en la Fase 2 los viajes.
 */
export async function usosDeCiudad(ciudadId: string): Promise<number> {
  void ciudadId;
  return 0;
}
