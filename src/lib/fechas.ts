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
