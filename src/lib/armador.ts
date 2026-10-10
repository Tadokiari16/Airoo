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
  /** Neto de la habitación por toda la estancia, en la moneda de la tarifa. */
  neto: number | null;
};

export type RenglonArmador = {
  id: string;
  concepto: string;
  boletoId: string | null;
  cantidad: number;
  netoUnitario: number | null;
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
  llegaDiaSiguiente: boolean;
  duracion: string;
  escalas: number;
};

export type TrayectoArmador = {
  id: string;
  desde: string;
  hasta: string;
  fecha: string | null;
  hora: string | null;
  vueloTramoId: string | null;
};

/** Lo propio de cada tipo, guardado en `partidas.detalle`. */
export type Detalle = {
  // Vuelo
  redondo?: boolean;
  pasajeros?: number;
  tua?: string;
  // Actividad
  duracion?: string;
  inclusiones?: string;
  personas?: number;
  // Servicio
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
  planId: string | null;
  varianteId: string | null;
  tarifaId: string | null;
  proveedorId: string | null;
  regimen: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  moneda: Moneda;
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

/** Netos de la partida: uno por habitación (hotel) o por renglón (lo demás). */
export function netosDe(p: Pick<PartidaArmador, "tipo" | "habitaciones" | "renglones">): (number | null)[] {
  if (p.tipo === "hotel") return p.habitaciones.map((h) => h.neto);
  return p.renglones.map((r) => (r.netoUnitario === null ? null : r.netoUnitario * r.cantidad));
}

export function aCalculo(p: PartidaArmador, fx: FixCotizacion): PartidaCalculo {
  return {
    id: p.id,
    tipo: p.tipo,
    opcionId: p.opcionId,
    moneda: p.moneda,
    tipoCambio: tipoCambioDe(p.moneda, fx),
    utilidadPb: p.utilidadPb,
    netos: netosDe(p),
    pagoProveedor: p.pagoProveedor,
    anticipoProveedorPb: p.anticipoProveedorPb,
    reembolsable: p.reembolsable,
    pagarAntes: p.pagarAntes,
  };
}

export const calcular = (p: PartidaArmador, fx: FixCotizacion) => calcularPartida(aCalculo(p, fx));

/** Personas que cubre una partida: huéspedes del hotel, pasajeros o boletos. */
export function personasDe(p: PartidaArmador): number {
  if (p.tipo === "hotel") return p.habitaciones.reduce((s, h) => s + h.adultos + h.menores, 0);
  if (p.tipo === "vuelo") return p.detalle.pasajeros ?? 0;
  if (p.tipo === "actividad") return p.renglones.reduce((s, r) => s + r.cantidad, 0);
  return p.detalle.personas ?? 0;
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

// ─── Antes de enviar ────────────────────────────────────────────────────────

export type Pendiente = { partidaId: string | null; texto: string };

export type Nombres = {
  /** Nombre corto de cada partida para los mensajes: «Seadust», «Xel-Há». */
  partida: Record<string, string>;
};

export type ViajePendientes = { adultos: number; menores: number; edadesMenores: number[] };

/**
 * Lo que impide enviar la cotización. Cada texto describe lo que falta, sin
 * órdenes, y se puede ir a la partida que lo tiene.
 */
export function pendientes(
  partidas: PartidaArmador[],
  viaje: ViajePendientes,
  fx: FixCotizacion,
  nombres: Nombres,
): Pendiente[] {
  const salida: Pendiente[] = [];
  const nombre = (p: PartidaArmador) => nombres.partida[p.id] ?? "Un servicio";
  if (partidas.length === 0) return [{ partidaId: null, texto: "La cotización no tiene servicios" }];
  if (viaje.edadesMenores.length < viaje.menores)
    salida.push({
      partidaId: null,
      texto: viaje.menores === 1 ? "Falta la edad del menor" : "Faltan edades de los menores",
    });

  for (const p of partidas) {
    if (p.tipo === "hotel") {
      if (p.habitaciones.length === 0) {
        salida.push({ partidaId: p.id, texto: `${nombre(p)} sin habitaciones` });
        continue;
      }
      p.habitaciones.forEach((h, i) => {
        if (h.adultos + h.menores === 0)
          salida.push({ partidaId: p.id, texto: `Habitación ${i + 1} sin huéspedes` });
      });
      const adultos = p.habitaciones.reduce((s, h) => s + h.adultos, 0);
      const menores = p.habitaciones.reduce((s, h) => s + h.menores, 0);
      const vacias = p.habitaciones.some((h) => h.adultos + h.menores === 0);
      if (!vacias && (adultos !== viaje.adultos || menores !== viaje.menores))
        salida.push({
          partidaId: p.id,
          texto: `${nombre(p)} acomoda ${adultos + menores} de ${viaje.adultos + viaje.menores} viajeros`,
        });
      if (p.habitaciones.some((h) => h.neto === null))
        salida.push({ partidaId: p.id, texto: `${nombre(p)} sin costo neto` });
    } else {
      if (p.tipo === "actividad" && !p.fechaInicio)
        salida.push({ partidaId: p.id, texto: `${nombre(p)} sin fecha` });
      if (p.tipo === "vuelo" && p.tramos.some((t) => !t.fecha || !t.sale || !t.llega))
        salida.push({ partidaId: p.id, texto: `${nombre(p)} sin horario completo` });
      if (p.renglones.length === 0 || p.renglones.some((r) => r.netoUnitario === null))
        salida.push({ partidaId: p.id, texto: `${nombre(p)} sin costo neto` });
    }
    if (p.moneda !== "MXN" && tipoCambioDe(p.moneda, fx) === null)
      salida.push({
        partidaId: p.id,
        texto: `${nombre(p)} en ${p.moneda === "USD" ? "dólares" : "euros"} sin tipo de cambio`,
      });
  }
  return salida;
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
    planId: null,
    varianteId: null,
    tarifaId: null,
    proveedorId: null,
    regimen: null,
    fechaInicio: tipo === "actividad" ? null : base.inicio,
    fechaFin: tipo === "hotel" || tipo === "vuelo" || tipo === "servicio" ? base.fin : null,
    moneda: "MXN",
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
