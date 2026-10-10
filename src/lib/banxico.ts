// Tipo de cambio de Banxico (API SIE, con token gratuito). Sin decimales
// flotantes: «18.4200» se guarda como 184200 diezmilésimos.

import type { Moneda } from "./dinero";

/** FIX del dólar y tipo de cambio del euro, ambos en pesos. */
export const SERIES: Record<Exclude<Moneda, "MXN">, string> = { USD: "SF43718", EUR: "SF46410" };

export type Dato = { moneda: Exclude<Moneda, "MXN">; fecha: string; diezmilesimos: number };

/** «18.4200» → 184200. null si no es un número. */
export function aDiezmilesimos(texto: string): number | null {
  const t = texto.trim().replace(/,/g, "");
  if (!/^\d{1,3}(\.\d{1,4})?$/.test(t)) return null;
  const [ent, dec = ""] = t.split(".");
  return Number(ent) * 10_000 + Number(dec.padEnd(4, "0"));
}

/** Lee la respuesta de `/series/SF43718,SF46410/datos/oportuno`. */
export function leerRespuesta(json: unknown): Dato[] {
  const series = (json as { bmx?: { series?: { idSerie: string; datos?: { fecha: string; dato: string }[] }[] } })
    ?.bmx?.series;
  if (!Array.isArray(series)) return [];
  const salida: Dato[] = [];
  for (const s of series) {
    const moneda = (Object.keys(SERIES) as (keyof typeof SERIES)[]).find((m) => SERIES[m] === s.idSerie);
    const d = s.datos?.at(-1);
    if (!moneda || !d) continue;
    const m = d.fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const valor = aDiezmilesimos(d.dato);
    if (!m || valor === null) continue;
    salida.push({ moneda, fecha: `${m[3]}-${m[2]}-${m[1]}`, diezmilesimos: valor });
  }
  return salida;
}

export async function consultarBanxico(token: string, espera = 5000): Promise<Dato[]> {
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${Object.values(SERIES).join(",")}/datos/oportuno`;
  const r = await fetch(url, {
    headers: { "Bmx-Token": token, Accept: "application/json" },
    signal: AbortSignal.timeout(espera),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Banxico respondió ${r.status}`);
  return leerRespuesta(await r.json());
}
