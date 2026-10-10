import "server-only";
import { db, schema } from "@/lib/db";

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
