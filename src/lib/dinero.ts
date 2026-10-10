// El dinero se guarda en centavos enteros, siempre con su moneda.
// Nunca se usan decimales flotantes para montos.

export const MONEDAS = ["MXN", "USD", "EUR"] as const;
export type Moneda = (typeof MONEDAS)[number];

const PREFIJO: Record<Moneda, string> = { MXN: "$", USD: "US$", EUR: "€" };

/** «$42,248.48», «US$1,980», «€2.50». Los centavos solo se muestran si los hay. */
export function formatoDinero(centavos: number, moneda: Moneda = "MXN"): string {
  if (!Number.isInteger(centavos)) {
    throw new Error("El monto debe ir en centavos enteros");
  }
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const enteros = Math.floor(abs / 100);
  const resto = abs % 100;
  const texto = enteros.toLocaleString("en-US") + (resto ? "." + String(resto).padStart(2, "0") : "");
  return (negativo ? "−" : "") + PREFIJO[moneda] + texto;
}

/** Convierte «42,248.48» o «$42248.5» a centavos. Devuelve null si no es un monto válido. */
export function aCentavos(texto: string): number | null {
  const limpio = texto.replace(/[^0-9.\-]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const [ent, dec = ""] = limpio.replace("-", "").split(".");
  const c = Number(ent) * 100 + Number(dec.padEnd(2, "0"));
  return limpio.startsWith("-") ? -c : c;
}
