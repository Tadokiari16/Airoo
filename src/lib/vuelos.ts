// Horarios de vuelo con la zona horaria de cada aeropuerto. Sin acceso a la
// base, para probarlo solo. Las horas se capturan en hora local del
// aeropuerto; la duración y las conexiones se calculan en hora real (UTC).

import { sumarDias } from "./fechas";

export type Aeropuerto = {
  iata: string;
  nombre: string;
  ciudad: string;
  pais: string;
  paisCodigo: string;
  zonaHoraria: string;
};

/** Lo que el cálculo necesita de un tramo. */
export type TramoHorario = {
  fecha: string | null;
  sale: string | null;
  llega: string | null;
  /** Días después de la salida en que llega, en hora local del destino. */
  llegaDias: number;
  origen: string;
  destino: string;
};

const MINUTO = 60_000;

/** Diferencia de la zona con UTC en ese instante, en minutos (Madrid en verano: +120). */
function desfase(ms: number, zona: string): number {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zona,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(+partes.year, +partes.month - 1, +partes.day, +partes.hour, +partes.minute);
  return Math.round((local - Math.floor(ms / MINUTO) * MINUTO) / MINUTO);
}

/** «2026-10-21» a las «19:26» en hora de Cancún → milisegundos UTC. */
export function instante(fecha: string, hora: string, zona: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  const comoUtc = Date.UTC(a, m - 1, d, h, min);
  // Dos pasadas: la segunda corrige cuando la hora cae del otro lado de un cambio de horario.
  let ms = comoUtc - desfase(comoUtc, zona) * MINUTO;
  ms = comoUtc - desfase(ms, zona) * MINUTO;
  return ms;
}

/** Hora local «16:05» y día «2026-10-25» de un instante en una zona. */
export function enZona(ms: number, zona: string): { dia: string; hora: string } {
  const local = new Date(ms + desfase(ms, zona) * MINUTO);
  const iso = local.toISOString();
  return { dia: iso.slice(0, 10), hora: iso.slice(11, 16) };
}

/** Salida y llegada en UTC, o null si falta algo para calcularlas. */
export function horarioReal(
  t: TramoHorario,
  aeropuertos: Record<string, Aeropuerto | undefined>,
): { sale: number; llega: number; diaLlegada: string } | null {
  const o = aeropuertos[t.origen];
  const d = aeropuertos[t.destino];
  if (!t.fecha || !t.sale || !t.llega || !o || !d) return null;
  const diaLlegada = sumarDias(t.fecha, t.llegaDias);
  return {
    sale: instante(t.fecha, t.sale, o.zonaHoraria),
    llega: instante(diaLlegada, t.llega, d.zonaHoraria),
    diaLlegada,
  };
}

/** 155 → «2 h 35 min»; 45 → «45 min»; 120 → «2 h». */
export function textoDuracion(minutos: number): string {
  const h = Math.floor(Math.abs(minutos) / 60);
  const m = Math.abs(minutos) % 60;
  const t = [h ? `${h} h` : "", m || !h ? `${m} min` : ""].filter(Boolean).join(" ");
  return minutos < 0 ? `-${t}` : t;
}

export const minutosEntre = (desde: number, hasta: number) => Math.round((hasta - desde) / MINUTO);

/**
 * Número de vuelo: clave de la aerolínea (2 caracteres, al menos una letra)
 * y de 1 a 4 dígitos. «vb2124» → { clave: "VB", texto: "VB 2124" }.
 */
export function leerNumeroVuelo(texto: string): { clave: string; numero: string; texto: string } | null {
  const m = texto
    .toUpperCase()
    .replace(/\s+/g, "")
    .match(/^([A-Z0-9]{2})(\d{1,4})$/);
  if (!m || !/[A-Z]/.test(m[1])) return null;
  return { clave: m[1], numero: m[2], texto: `${m[1]} ${m[2]}` };
}

/** «Cancún (CUN)» */
export const nombreAeropuerto = (a: Aeropuerto | undefined, iata: string) => (a ? `${a.ciudad} (${a.iata})` : iata);
