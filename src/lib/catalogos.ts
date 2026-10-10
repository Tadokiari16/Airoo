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
    viajes: 0,
  };
}
