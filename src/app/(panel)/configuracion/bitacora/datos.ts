import "server-only";
import { desc, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Entradas del último año, de la más reciente a la más vieja. */
export async function entradasBitacora(limite?: number) {
  const haceUnAnio = new Date(Date.now() - 365 * 86400_000);
  const q = db
    .select({
      id: schema.bitacora.id,
      cuando: schema.bitacora.cuando,
      texto: schema.bitacora.texto,
      quien: schema.usuarios.nombre,
    })
    .from(schema.bitacora)
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.bitacora.quien))
    .where(gt(schema.bitacora.cuando, haceUnAnio))
    .orderBy(desc(schema.bitacora.cuando));
  return limite ? q.limit(limite) : q;
}
