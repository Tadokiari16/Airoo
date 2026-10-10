import "server-only";
import { desc, and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatoFechaCorta } from "@/lib/fechas";

type Entrada = {
  quien: string | null;
  texto: string;
  entidad?: string;
  entidadId?: string;
  antes?: unknown;
  despues?: unknown;
};

/** Deja constancia de un cambio: «Asesora 1 se unió al equipo». */
export async function anotar(e: Entrada, tx: Pick<typeof db, "insert"> = db) {
  await tx.insert(schema.bitacora).values({
    quien: e.quien,
    texto: e.texto,
    entidad: e.entidad,
    entidadId: e.entidadId,
    antes: e.antes ?? null,
    despues: e.despues ?? null,
  });
}

export type Cambio = { id: string; texto: string; quien: string; cuando: string };

/** «Ver historial de cambios» de una ficha: lo que la bitácora tiene de ella. */
export async function historialDe(entidad: string, id: string): Promise<Cambio[]> {
  const filas = await db
    .select({ b: schema.bitacora, quien: schema.usuarios.nombre })
    .from(schema.bitacora)
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.bitacora.quien))
    .where(and(eq(schema.bitacora.entidad, entidad), eq(schema.bitacora.entidadId, id)))
    .orderBy(desc(schema.bitacora.cuando))
    .limit(50);
  return filas.map((f) => ({
    id: f.b.id,
    texto: f.b.texto,
    quien: f.quien ?? "El sistema",
    cuando: formatoFechaCorta(f.b.cuando),
  }));
}
