// Todas las fechas se muestran en hora de Cancún.
export const ZONA = "America/Cancun";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

type Partes = { anio: number; mes: number; dia: number; diaSemana: number; hora: number; minuto: number };

export function partesEnCancun(fecha: Date): Partes {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const v = (t: string) => f.find((p) => p.type === t)!.value;
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday"));
  return {
    anio: Number(v("year")),
    mes: Number(v("month")) - 1,
    dia: Number(v("day")),
    diaSemana: semana,
    hora: Number(v("hour")),
    minuto: Number(v("minute")),
  };
}

/** «Mié 21 oct» */
export function formatoFecha(fecha: Date): string {
  const p = partesEnCancun(fecha);
  return `${DIAS[p.diaSemana]} ${p.dia} ${MESES[p.mes]}`;
}

/** «Martes 29 de septiembre», para el saludo del panel. */
export function formatoFechaLarga(fecha: Date): string {
  const p = partesEnCancun(fecha);
  return `${DIAS_LARGOS[p.diaSemana]} ${p.dia} de ${MESES_LARGOS[p.mes]}`;
}

/** «6:02 PM» */
export function formatoHora(fecha: Date): string {
  const p = partesEnCancun(fecha);
  const h12 = p.hora % 12 === 0 ? 12 : p.hora % 12;
  return `${h12}:${String(p.minuto).padStart(2, "0")} ${p.hora < 12 ? "AM" : "PM"}`;
}

/** «Mar 29 sep, 6:02 PM», como en la bitácora. */
export function formatoFechaHora(fecha: Date): string {
  return `${formatoFecha(fecha)}, ${formatoHora(fecha)}`;
}

export function saludo(fecha: Date): string {
  const h = partesEnCancun(fecha).hora;
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** «3 sep 2026», para historiales («Verificada por Luis · 3 sep 2026»). */
export function formatoFechaCorta(fecha: Date): string {
  const p = partesEnCancun(fecha);
  return `${p.dia} ${MESES[p.mes]} ${p.anio}`;
}

/** «oct 2026», para «desde oct 2026». */
export function formatoMesAnio(fecha: Date): string {
  const p = partesEnCancun(fecha);
  return `${MESES[p.mes]} ${p.anio}`;
}

// ─── Días sin hora (fechas de viaje, vencimientos) ──────────────────────────
// Se guardan como «2026-10-21» y se leen en hora de Cancún.

/** Mediodía en Cancún del día dado, para formatearlo sin brincar de día. */
export function deDia(dia: string): Date {
  return new Date(`${dia}T17:00:00Z`);
}

/** Hoy en Cancún: «2026-10-10». */
export function hoyEnCancun(ahora = new Date()): string {
  const p = partesEnCancun(ahora);
  return `${p.anio}-${String(p.mes + 1).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

export function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Noches (o días de diferencia) entre dos días. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000);
}

/** «Mié 21 oct» de un día guardado. */
export const formatoDia = (dia: string) => formatoFecha(deDia(dia));

/** «21–27 oct», «29 sep–3 oct», como en la lista de viajes. */
export function rangoCorto(desde: string, hasta: string): string {
  const a = partesEnCancun(deDia(desde));
  const b = partesEnCancun(deDia(hasta));
  if (a.mes === b.mes) return `${a.dia}–${b.dia} ${MESES[b.mes]}`;
  return `${a.dia} ${MESES[a.mes]}–${b.dia} ${MESES[b.mes]}`;
}

/** «Mié 21 – Mar 27 oct», como en el encabezado del viaje. */
export function rangoLargo(desde: string, hasta: string): string {
  const a = partesEnCancun(deDia(desde));
  const b = partesEnCancun(deDia(hasta));
  const inicio = a.mes === b.mes ? `${DIAS[a.diaSemana]} ${a.dia}` : formatoDia(desde);
  return `${inicio} – ${formatoDia(hasta)}`;
}

/** «Hace 12 min», «Ayer, 6:10 PM», «Lun 28 sep», como en «Última actividad». */
export function haceCuanto(fecha: Date, ahora = new Date()): string {
  const min = Math.floor((ahora.getTime() - fecha.getTime()) / 60_000);
  if (min < 1) return "Hace un momento";
  if (min < 60) return `Hace ${min} min`;
  const hoy = hoyEnCancun(ahora);
  const dia = hoyEnCancun(fecha);
  if (dia === hoy) return `Hoy, ${formatoHora(fecha)}`;
  if (dia === sumarDias(hoy, -1)) return `Ayer, ${formatoHora(fecha)}`;
  return formatoFecha(fecha);
}
