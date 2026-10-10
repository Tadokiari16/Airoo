import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { UsosProveedor } from "@/lib/usos";

export { totalUsos } from "@/lib/usos";

// Cuántas veces se usa un registro de catálogo. Eliminar solo se permite si
// nunca se usó; si se usó, solo archivar. En la Fase 2 se suman las partidas
// de las cotizaciones y las reservas.

export async function usosDeProveedor(id: string): Promise<UsosProveedor> {
  const cuenta = async (
    tabla:
      typeof schema.hotelProveedores | typeof schema.actividadProveedores | typeof schema.servicioProveedores,
  ) => {
    const [f] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tabla)
      .where(eq(tabla.proveedorId, id));
    return f?.n ?? 0;
  };
  return {
    hoteles: await cuenta(schema.hotelProveedores),
    actividades: await cuenta(schema.actividadProveedores),
    servicios: await cuenta(schema.servicioProveedores),
    viajes: await viajesQueUsan("proveedorId", id),
  };
}

// ─── Viajes que usan un registro (Fase 2) ───────────────────────────────────

type CampoPartida = "hotelId" | "actividadId" | "servicioId" | "aerolineaId" | "proveedorId";

/** Viajes distintos con alguna partida que usa este registro, en cualquier versión. */
export async function viajesQueUsan(campo: CampoPartida, id: string): Promise<number> {
  const [f] = await db
    .select({ n: sql<number>`count(distinct ${schema.cotizaciones.viajeId})::int` })
    .from(schema.partidas)
    .innerJoin(schema.cotizaciones, eq(schema.cotizaciones.id, schema.partidas.cotizacionId))
    .where(eq(schema.partidas[campo], id));
  return f?.n ?? 0;
}

/** Lo mismo para toda una lista: id del registro → número de viajes. */
export async function viajesPorRegistro(campo: CampoPartida): Promise<Map<string, number>> {
  const col = schema.partidas[campo];
  const filas = await db
    .select({ id: col, n: sql<number>`count(distinct ${schema.cotizaciones.viajeId})::int` })
    .from(schema.partidas)
    .innerJoin(schema.cotizaciones, eq(schema.cotizaciones.id, schema.partidas.cotizacionId))
    .where(sql`${col} is not null`)
    .groupBy(col);
  return new Map(filas.map((f) => [f.id as string, f.n]));
}
