import "server-only";
import { and, desc, eq, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { consultarBanxico, type Dato } from "@/lib/banxico";
import { hoyEnCancun } from "@/lib/fechas";

export type TipoCambio = { fecha: string; diezmilesimos: number; fuente: "banxico" | "manual" };
type Extranjera = Dato["moneda"];

const t = schema.tiposCambio;

export async function guardarTipoCambio(d: Dato, fuente: "banxico" | "manual", quien: string | null = null) {
  await db
    .insert(t)
    .values({ ...d, fuente, capturadoPor: quien })
    .onConflictDoUpdate({
      target: [t.fecha, t.moneda],
      set: { diezmilesimos: d.diezmilesimos, fuente, capturadoPor: quien },
    });
}

/** Lo que corre la tarea diaria. Sin token no hace nada. */
export async function actualizarDesdeBanxico(): Promise<Dato[]> {
  const token = process.env.BANXICO_TOKEN;
  if (!token) return [];
  const datos = await consultarBanxico(token);
  for (const d of datos) await guardarTipoCambio(d, "banxico");
  return datos;
}

let ultimoIntento = 0;

/**
 * El último publicado hasta hoy. Si el guardado es de un día anterior y hay
 * token, intenta traer el de hoy (a lo más cada 30 minutos), por si la tarea
 * diaria no corrió.
 */
export async function tipoCambioVigente(moneda: Extranjera): Promise<TipoCambio | null> {
  const hoy = hoyEnCancun();
  const leer = async () => {
    const [f] = await db
      .select({ fecha: t.fecha, diezmilesimos: t.diezmilesimos, fuente: t.fuente })
      .from(t)
      .where(and(eq(t.moneda, moneda), lte(t.fecha, hoy)))
      .orderBy(desc(t.fecha))
      .limit(1);
    return f ?? null;
  };
  const actual = await leer();
  if ((!actual || actual.fecha < hoy) && process.env.BANXICO_TOKEN && Date.now() - ultimoIntento > 30 * 60_000) {
    ultimoIntento = Date.now();
    try {
      await actualizarDesdeBanxico();
      return await leer();
    } catch {
      return actual;
    }
  }
  return actual;
}
