// Lo que el armador maneja de cada partida y las revisiones de «Antes de
// enviar». Sin acceso a la base: el armador (cliente) y las acciones del
// servidor usan los mismos tipos y las mismas reglas.

import {
  calcularPartida,
  tipoCambioConColchon,
  type PagoProveedor,
  type PartidaCalculo,
  type TipoPartida,
} from "./cotizacion";
import type { Moneda } from "./dinero";
import { formatoDia } from "./fechas";

export type HabitacionArmador = {
  id: string;
  habitacionId: string;
  cama: string | null;
  adultos: number;
  menores: number;
};

export type RenglonArmador = {
  id: string;
  concepto: string;
  boletoId: string | null;
  cantidad: number;
};

export type TramoArmador = {
  id: string;
  sentido: "ida" | "regreso";
  numero: string;
  fecha: string | null;
  origen: string;
  destino: string;
  terminalSalida: string;
  terminalLlegada: string;
  sale: string | null;
  llega: string | null;
  /** Días después de la salida en que llega, en hora local del destino: 0, 1 o 2. */
  llegaDias: number;
};

export type TrayectoArmador = {
  id: string;
  desde: string;
  hasta: string;
  fecha: string | null;
  hora: string | null;
  vueloTramoId: string | null;
  /** Fecha y hora del vuelo cuando se ligó o se revisó; si el vuelo cambia, queda «por revisar». */
  vueloFecha: string | null;
  vueloHora: string | null;
};

export type TuaAeropuerto = { tramoId: string; iata: string; centavos: number | null; moneda: Moneda };

/** Lo propio de cada tipo, guardado en `partidas.detalle`. */
export type Detalle = {
  // Vuelo
  redondo?: boolean;
  pasajeros?: number;
  /** Texto libre de antes de que la TUA fuera una fila por aeropuerto; solo se lee. */
  tua?: string;
  /** TUA informativa: un monto por aeropuerto de salida de cada tramo. No entra al costo. */
  tuas?: TuaAeropuerto[];
  // Actividad
  duracion?: string;
  inclusiones?: string;
  personas?: number;
  // Traslado
  modo?: "aeropuerto_hotel" | "libre";
  servicio?: "privado" | "compartido";
  sentido?: "sencillo" | "redondo";
  /** Sencillo aeropuerto–hotel: llegada (aeropuerto → hotel) o salida (hotel → aeropuerto). */
  direccion?: "llegada" | "salida";
  maletas?: number;
  // Servicio (los traslados viejos también usan recoleccion)
  recoleccion?: "ida" | "regreso" | "redondo";
  duracionAprox?: string;
  cobertura?: string;
  mayores70?: number;
  dias?: number;
};

export type PartidaArmador = {
  id: string;
  tipo: TipoPartida;
  opcionId: string | null;
  orden: number;
  hotelId: string | null;
  actividadId: string | null;
  servicioId: string | null;
  aerolineaId: string | null;
  /** Traslado privado: el tipo de unidad. Compartido: null. */
  trasladoUnidadId: string | null;
  planId: string | null;
  varianteId: string | null;
  tarifaId: string | null;
  proveedorId: string | null;
  regimen: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  moneda: Moneda;
  /** Lo que cobra el proveedor por todo el servicio, en la moneda de la tarifa. */
  netoTotal: number | null;
  utilidadPb: number;
  utilidadManual: boolean;
  detalle: Detalle;
  pagoProveedor: PagoProveedor;
  anticipoProveedorPb: number;
  pagarAntes: string | null;
  cancelacionGratisHasta: string | null;
  cancelacionTexto: string | null;
  reembolsable: boolean;
  habitaciones: HabitacionArmador[];
  renglones: RenglonArmador[];
  tramos: TramoArmador[];
  trayectos: TrayectoArmador[];
};

/** El FIX guardado en la cotización y el colchón que se le suma. */
export type FixCotizacion = { fixUsd: number | null; fixEur: number | null; colchonPb: number };

export function tipoCambioDe(moneda: Moneda, fx: FixCotizacion): number | null {
  if (moneda === "MXN") return null;
  const fix = moneda === "USD" ? fx.fixUsd : fx.fixEur;
  return fix ? tipoCambioConColchon(fix, fx.colchonPb) : null;
}

export function aCalculo(p: PartidaArmador, fx: FixCotizacion): PartidaCalculo {
  return {
    id: p.id,
    tipo: p.tipo,
    opcionId: p.opcionId,
    moneda: p.moneda,
    tipoCambio: tipoCambioDe(p.moneda, fx),
    utilidadPb: p.utilidadPb,
    netos: [p.netoTotal],
    pagoProveedor: p.pagoProveedor,
    anticipoProveedorPb: p.anticipoProveedorPb,
    reembolsable: p.reembolsable,
    pagarAntes: p.pagarAntes,
  };
}

export const calcular = (p: PartidaArmador, fx: FixCotizacion) => calcularPartida(aCalculo(p, fx));

/**
 * Vuelo redondo: el regreso sale de donde llega la ida y llega a donde ella salió
 * (GDL → CUN / CUN → GDL). Se completa solo cuando el campo está vacío o todavía
 * tiene la ruta invertida anterior; si alguien lo cambió a mano, se respeta.
 */
export function completarRegreso(antes: TramoArmador[], despues: TramoArmador[]): TramoArmador[] {
  const ruta = (t: TramoArmador[]) => {
    const ida = t.filter((x) => x.sentido === "ida");
    return { sale: ida[0]?.origen ?? "", llega: ida.at(-1)?.destino ?? "" };
  };
  const a = ruta(antes);
  const d = ruta(despues);
  if (a.sale === d.sale && a.llega === d.llega) return despues;
  const regreso = despues.filter((x) => x.sentido === "regreso");
  if (regreso.length === 0) return despues;
  const primero = regreso[0].id;
  const ultimo = regreso.at(-1)!.id;
  return despues.map((t) => {
    if (t.sentido !== "regreso") return t;
    let nuevo = t;
    if (t.id === primero && (t.origen === "" || t.origen === a.llega)) nuevo = { ...nuevo, origen: d.llega };
    if (t.id === ultimo && (t.destino === "" || t.destino === a.sale)) nuevo = { ...nuevo, destino: d.sale };
    return nuevo;
  });
}

// ─── Opciones ───────────────────────────────────────────────────────────────

export type Opcion = { id: string; orden: number; recomendada: boolean };

/**
 * Las opciones que se comparan. Sin opciones hay una sola, la cotización
 * completa (id null). Cada opción lleva su hotel más lo que va en todas.
 */
export function vistasDeOpcion(opciones: Opcion[]): (string | null)[] {
  return opciones.length ? [...opciones].sort((a, b) => a.orden - b.orden).map((o) => o.id) : [null];
}

// ─── Horas ──────────────────────────────────────────────────────────────────

/**
 * Lee una hora escrita rápido: «745p» → 19:45, «7:45 pm» → 19:45, «1930» →
 * 19:30, «9a» → 09:00. Devuelve null si no se entiende.
 */
export function leerHora(texto: string): string | null {
  const t = texto.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  const m = t.match(/^(\d{1,2})(?::?(\d{2}))?(a|p|am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const sufijo = m[3]?.[0];
  if (min > 59) return null;
  if (sufijo) {
    if (h < 1 || h > 12) return null;
    if (sufijo === "p" && h !== 12) h += 12;
    if (sufijo === "a" && h === 12) h = 0;
  } else if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** «19:45» → «07:45 PM», como en los prototipos. */
export function horaTexto(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${sufijo}`;
}

/** «Mié 21 oct» o «Falta la fecha». */
export const fechaOFalta = (dia: string | null) => (dia ? formatoDia(dia) : "Falta la fecha");

/** Partida vacía de un tipo, con los valores que propone la cotización. */
export function partidaNueva(
  tipo: TipoPartida,
  base: {
    id: string;
    utilidadPb: number;
    inicio: string;
    fin: string;
    orden: number;
  },
): PartidaArmador {
  return {
    id: base.id,
    tipo,
    opcionId: null,
    orden: base.orden,
    hotelId: null,
    actividadId: null,
    servicioId: null,
    aerolineaId: null,
    trasladoUnidadId: null,
    planId: null,
    varianteId: null,
    tarifaId: null,
    proveedorId: null,
    regimen: null,
    // Las fechas del traslado van en sus trayectos.
    fechaInicio: tipo === "actividad" || tipo === "traslado" ? null : base.inicio,
    fechaFin: tipo === "hotel" || tipo === "vuelo" || tipo === "servicio" ? base.fin : null,
    moneda: "MXN",
    netoTotal: null,
    utilidadPb: base.utilidadPb,
    utilidadManual: false,
    detalle: {},
    pagoProveedor: "al_reservar",
    anticipoProveedorPb: 0,
    pagarAntes: null,
    cancelacionGratisHasta: null,
    cancelacionTexto: null,
    reembolsable: false,
    habitaciones: [],
    renglones: [],
    tramos: [],
    trayectos: [],
  };
}

export const MARGENES = [800, 1000, 1200, 1500] as const;

/** Un id nuevo para lo que se crea en el navegador (se respeta al guardar). */
export const nuevoId = () => crypto.randomUUID();


/** Una fila de TUA por cada tramo con aeropuerto de salida, con el monto ya capturado si coincide. */
export function filasTua(
  tramos: Pick<TramoArmador, "id" | "origen">[],
  tuas: TuaAeropuerto[] | undefined,
  monedaDe: (iata: string) => Moneda = () => "MXN",
): TuaAeropuerto[] {
  return tramos
    .filter((t) => t.origen)
    .map((t) => {
      const ya = tuas?.find((x) => x.tramoId === t.id && x.iata === t.origen);
      return ya ?? { tramoId: t.id, iata: t.origen, centavos: null, moneda: monedaDe(t.origen) };
    });
}
