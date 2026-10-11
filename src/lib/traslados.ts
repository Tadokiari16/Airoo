// Reglas de los traslados que no dependen de la base de datos: la capacidad de
// cada tipo de unidad, cuál conviene para un grupo y qué avisa el armador.
// El catálogo solo guarda tipos de unidad (sin ciudad, proveedor ni precio).

export const MAX_PASAJEROS = 60;
/** Al agregar un traslado desde el armador, «compartido» va en lugar del id de una unidad. */
export const COMPARTIDO = "compartido";
export const MAX_MALETAS = 80;

export type Capacidad = { pasajeros: number; maletas: number };
export type UnidadTraslado = Capacidad & { id: string; nombre: string; adaptada: boolean };

const plural = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

/** «Hasta 6 pasajeros · 6 maletas». */
export function textoCapacidad(c: Capacidad): string {
  return `Hasta ${plural(c.pasajeros, "pasajero", "pasajeros")} · ${plural(c.maletas, "maleta", "maletas")}`;
}

/** Lo que el armador avisa cuando el grupo no cabe en la unidad elegida. */
export function avisosCapacidad(
  u: Capacidad & { nombre: string },
  personas: number,
  maletas: number | null,
): string[] {
  const r: string[] = [];
  if (personas > u.pasajeros)
    r.push(`Son ${plural(personas, "pasajero", "pasajeros")} y la unidad ${u.nombre} lleva hasta ${u.pasajeros}.`);
  if (maletas != null && maletas > u.maletas)
    r.push(`Son ${plural(maletas, "maleta", "maletas")} y la unidad ${u.nombre} lleva hasta ${u.maletas}.`);
  return r;
}

/**
 * La unidad más chica en la que cabe el grupo. Las adaptadas solo se proponen
 * si se piden. Si ninguna alcanza, la más grande.
 */
export function unidadSugerida<T extends UnidadTraslado>(
  unidades: T[],
  personas: number,
  maletas: number | null,
  adaptada = false,
): T | null {
  const candidatas = unidades
    .filter((u) => u.adaptada === adaptada)
    .sort((a, b) => a.pasajeros - b.pasajeros || a.maletas - b.maletas);
  if (candidatas.length === 0) return null;
  return (
    candidatas.find((u) => u.pasajeros >= personas && (maletas == null || u.maletas >= maletas)) ??
    candidatas[candidatas.length - 1]
  );
}

export type RevisionUnidad = { clave: string; ok: boolean; falta: string };

export function revisarUnidad(u: { foto: string | null; descripcion: string | null }): RevisionUnidad[] {
  return [
    { clave: "foto", ok: !!u.foto, falta: "Falta la foto" },
    { clave: "descripcion", ok: !!u.descripcion?.trim(), falta: "Falta la descripción" },
  ];
}

export function textoFichaUnidad(revision: RevisionUnidad[]): string {
  const faltan = revision.filter((r) => !r.ok);
  if (faltan.length === 0) return "Completa";
  if (faltan.length === 1) return faltan[0].falta;
  return "Faltan foto y descripción";
}

/** Error de una capacidad capturada, o null si está bien. */
export function errorCapacidad(c: Capacidad): string | null {
  if (!Number.isInteger(c.pasajeros) || c.pasajeros < 1 || c.pasajeros > MAX_PASAJEROS)
    return `Los pasajeros van de 1 a ${MAX_PASAJEROS}.`;
  if (!Number.isInteger(c.maletas) || c.maletas < 0 || c.maletas > MAX_MALETAS)
    return `Las maletas van de 0 a ${MAX_MALETAS}.`;
  return null;
}

// ─── Traslados en el armador ────────────────────────────────────────────────

/** Lo mínimo de un tramo de vuelo para ligar un traslado. */
export type TramoLigable = {
  id: string;
  sentido: "ida" | "regreso";
  numero: string;
  fecha: string | null;
  origen: string;
  destino: string;
  sale: string | null;
  llega: string | null;
  llegaDias: number;
};

/** Lo mínimo de un trayecto del traslado. */
export type TrayectoLigable = {
  id: string;
  desde: string;
  hasta: string;
  fecha: string | null;
  hora: string | null;
  vueloTramoId: string | null;
  vueloFecha: string | null;
  vueloHora: string | null;
};

const sumarDia = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * El momento del vuelo que le importa al traslado: la llegada en la ida (el
 * traslado espera en el aeropuerto) y la salida en el regreso.
 */
export function momentoVuelo(t: TramoLigable): { fecha: string | null; hora: string | null } {
  if (t.sentido === "ida") return { fecha: t.fecha ? sumarDia(t.fecha, t.llegaDias) : null, hora: t.llega };
  return { fecha: t.fecha, hora: t.sale };
}

/**
 * Si el vuelo del que salió el trayecto cambió de horario o ya no está. Un
 * trayecto que nunca se ligó a un vuelo no queda por revisar.
 */
export function estadoLiga(
  t: TrayectoLigable,
  tramos: Record<string, TramoLigable | undefined>,
): "ok" | "cambio" | "sin_vuelo" | "sin_liga" {
  if (!t.vueloTramoId && !t.vueloFecha && !t.vueloHora) return "sin_liga";
  // Al borrar el vuelo la liga queda vacía, pero el horario guardado sigue.
  const tramo = t.vueloTramoId ? tramos[t.vueloTramoId] : undefined;
  if (!tramo) return "sin_vuelo";
  // Un vuelo sin horario al ligarlo que después lo tiene también cuenta como cambio.
  const m = momentoVuelo(tramo);
  return m.fecha === t.vueloFecha && m.hora === t.vueloHora ? "ok" : "cambio";
}

/** Liga el trayecto al tramo y guarda su horario de hoy, para notar si cambia. */
export function ligar<T extends TrayectoLigable>(t: T, tramo: TramoLigable | undefined): T {
  if (!tramo) return { ...t, vueloTramoId: null, vueloFecha: null, vueloHora: null };
  const m = momentoVuelo(tramo);
  return { ...t, vueloTramoId: tramo.id, vueloFecha: m.fecha, vueloHora: m.hora };
}

/** «Aeropuerto de Cancún (CUN)», o «Aeropuerto» si todavía no hay vuelo. */
export function lugarAeropuerto(iata: string, ciudad?: string): string {
  if (!iata) return "Aeropuerto";
  return ciudad ? `Aeropuerto de ${ciudad} (${iata})` : `Aeropuerto ${iata}`;
}

/** «14:30» menos horas y media horas: «11:30». Si cruza la medianoche, el día anterior. */
export function restarHoras(hora: string, horas: number): { hora: string; diaAntes: boolean } {
  const [h, m] = hora.split(":").map(Number);
  let min = h * 60 + m - Math.round(horas * 60);
  const diaAntes = min < 0;
  if (diaAntes) min += 24 * 60;
  return { hora: `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`, diaAntes };
}

/**
 * Los trayectos del modo aeropuerto–hotel, propuestos con el vuelo y el hotel
 * de la cotización. Conserva los ids de los trayectos que ya había.
 */
export function proponerTrayectos<T extends TrayectoLigable>(a: {
  sentido: "sencillo" | "redondo";
  direccion: "llegada" | "salida";
  tramos: TramoLigable[];
  /** Hotel de la primera noche y de la última; null si hay opciones o todavía no hay hotel. */
  hoteles: { llegada: string | null; salida: string | null };
  ciudadDe: (iata: string) => string | undefined;
  viaje: { inicio: string; fin: string };
  actuales: T[];
  nuevoId: () => string;
}): TrayectoLigable[] {
  const ida = a.tramos.filter((t) => t.sentido === "ida").at(-1);
  const regreso = a.tramos.find((t) => t.sentido === "regreso");
  const llegaA = ida?.destino ?? regreso?.origen ?? "";
  const saleDe = regreso?.origen ?? ida?.destino ?? "";
  const salida: TrayectoLigable[] = [];
  const idDe = (i: number) => a.actuales[i]?.id ?? a.nuevoId();

  if (a.sentido === "redondo" || a.direccion === "llegada") {
    const m = ida ? momentoVuelo(ida) : null;
    salida.push(
      ligar(
        {
          id: idDe(0),
          desde: lugarAeropuerto(llegaA, a.ciudadDe(llegaA)),
          hasta: a.hoteles.llegada ?? "Hotel",
          fecha: m?.fecha ?? a.viaje.inicio,
          hora: m?.hora ?? null,
          vueloTramoId: null,
          vueloFecha: null,
          vueloHora: null,
        },
        ida,
      ),
    );
  }
  if (a.sentido === "redondo" || a.direccion === "salida") {
    // La hora de recogida depende del tráfico y de cuánto antes se llega: se escribe a mano.
    const anterior = a.actuales[salida.length];
    salida.push(
      ligar(
        {
          id: idDe(salida.length),
          desde: a.hoteles.salida ?? "Hotel",
          hasta: lugarAeropuerto(saleDe, a.ciudadDe(saleDe)),
          fecha: regreso?.fecha ?? a.viaje.fin,
          hora: anterior && anterior.vueloTramoId === regreso?.id ? anterior.hora : null,
          vueloTramoId: null,
          vueloFecha: null,
          vueloHora: null,
        },
        regreso,
      ),
    );
  }
  return salida;
}

/** El hotel de la llegada y el de la salida, por fechas. Con opciones de hotel no hay uno solo. */
export function hotelesDelViaje(
  hoteles: { opcionId: string | null; fechaInicio: string | null; nombre: string }[],
): { llegada: string | null; salida: string | null } {
  if (hoteles.some((h) => h.opcionId)) return { llegada: null, salida: null };
  const orden = [...hoteles].sort((a, b) => (a.fechaInicio ?? "").localeCompare(b.fechaInicio ?? ""));
  return { llegada: orden[0]?.nombre ?? null, salida: orden.at(-1)?.nombre ?? null };
}
