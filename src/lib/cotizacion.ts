// Reglas de dinero del armador, sin acceso a la base, para probarlas solas.
// CLAUDE.md › Precios y dinero, y propuestas/Fase-2-propuesta.md (sección 6).
//
// - Montos en centavos enteros, con la moneda de cada tarifa.
// - Porcentajes en puntos base: 1000 = 10%, 250 = 2.5%.
// - Tipos de cambio en diezmilésimos: 184200 = 18.4200 pesos por dólar.
// - Días como «2026-10-21».

import { diasEntre, sumarDias } from "./fechas";
import type { Moneda } from "./dinero";

export type TipoPartida = "hotel" | "vuelo" | "actividad" | "traslado" | "servicio";
export type PagoProveedor = "al_reservar" | "anticipo" | "en_el_lugar";

/** Lo que el cálculo necesita de una partida. */
export type PartidaCalculo = {
  id: string;
  tipo: TipoPartida;
  /** Con opción: es una de las opciones de hotel. Sin opción: va igual en todas. */
  opcionId: string | null;
  moneda: Moneda;
  /** Diezmilésimos con colchón; null en pesos o si todavía no hay FIX. */
  tipoCambio: number | null;
  utilidadPb: number;
  /** Neto de cada habitación o renglón, en la moneda de la tarifa. null = falta capturarlo. */
  netos: (number | null)[];
  pagoProveedor: PagoProveedor;
  anticipoProveedorPb: number;
  reembolsable: boolean;
  pagarAntes: string | null;
};

// ─── Tipo de cambio, neto en pesos y precio ─────────────────────────────────

/** FIX + colchón: 18.4200 con 1.5% → 18.6963. */
export function tipoCambioConColchon(fix: number, colchonPb: number): number {
  return Math.round((fix * (10_000 + colchonPb)) / 10_000);
}

/** «18.70» */
export const textoTipoCambio = (diezmilesimos: number) => (diezmilesimos / 10_000).toFixed(2);

/** «10%», «2.5%» */
export const textoPorcentaje = (pb: number) => `${Number((pb / 100).toFixed(2))}%`;

export const aPuntosBase = (porcentaje: number) => Math.round(porcentaje * 100);

export function netoEnPesos(neto: number, moneda: Moneda, tipoCambio: number | null): number | null {
  if (moneda === "MXN") return neto;
  if (!tipoCambio) return null;
  return Math.round((neto * tipoCambio) / 10_000);
}

/** Precio al cliente: neto en pesos más la utilidad, redondeado al centavo. */
export function precioCliente(netoMxn: number, utilidadPb: number): number {
  return Math.round((netoMxn * (10_000 + utilidadPb)) / 10_000);
}

export type Calculo = {
  /** Neto en la moneda de la tarifa; null si falta algún neto. */
  neto: number | null;
  netoMxn: number | null;
  precio: number | null;
  ganancia: number | null;
  /** Lo que el cliente paga en el destino, directo al proveedor (en pesos). */
  enDestino: number;
};

export function calcularPartida(p: PartidaCalculo): Calculo {
  const vacio = { neto: null, netoMxn: null, precio: null, ganancia: null, enDestino: 0 };
  if (p.netos.length === 0 || p.netos.some((n) => n === null)) return vacio;
  const neto = (p.netos as number[]).reduce((a, n) => a + n, 0);
  const netoMxn = netoEnPesos(neto, p.moneda, p.tipoCambio);
  if (netoMxn === null) return { ...vacio, neto };
  const precio = precioCliente(netoMxn, p.utilidadPb);
  let enDestino = 0;
  if (p.pagoProveedor === "en_el_lugar") enDestino = netoMxn;
  if (p.pagoProveedor === "anticipo")
    enDestino = netoMxn - Math.round((netoMxn * p.anticipoProveedorPb) / 10_000);
  return { neto, netoMxn, precio, ganancia: precio - netoMxn, enDestino };
}

// ─── Totales de una opción ──────────────────────────────────────────────────

export const SECCION: Record<TipoPartida, "hospedaje" | "vuelos" | "actividades" | "servicios"> = {
  hotel: "hospedaje",
  vuelo: "vuelos",
  actividad: "actividades",
  traslado: "servicios",
  servicio: "servicios",
};

export type Ajustes = {
  cargoServicio: number;
  conIva: boolean;
  /** 1600 = 16% */
  ivaPb: number;
  personas: number;
};

export type Totales = {
  secciones: Record<"hospedaje" | "vuelos" | "actividades" | "servicios", number>;
  cargoServicio: number;
  subtotal: number;
  iva: number;
  total: number;
  porPersona: number;
  costo: number;
  ganancia: number;
  /** Ganancia sobre el subtotal, en puntos base. */
  gananciaPb: number;
  enDestino: number;
  pagosAiroo: number;
  /** Falso si alguna partida no tiene neto o tipo de cambio: el total no está completo. */
  completo: boolean;
};

/** Las partidas que entran en una opción: las suyas más las que van igual en todas. */
export const partidasDeOpcion = <T extends { opcionId: string | null }>(partidas: T[], opcionId: string | null) =>
  partidas.filter((p) => p.opcionId === null || p.opcionId === opcionId);

/**
 * Precio por persona de un monto: se divide entre los pasajeros del viaje, no entre
 * los huéspedes de las habitaciones. Se calcula al mostrar, no se guarda.
 */
export const precioPorPersona = (centavos: number, pasajeros: number): number | null =>
  pasajeros > 0 ? Math.round(centavos / pasajeros) : null;

export function totales(partidas: PartidaCalculo[], a: Ajustes): Totales {
  const secciones = { hospedaje: 0, vuelos: 0, actividades: 0, servicios: 0 };
  let costo = 0;
  let enDestino = 0;
  let completo = true;
  for (const p of partidas) {
    const c = calcularPartida(p);
    if (c.precio === null || c.netoMxn === null) {
      completo = false;
      continue;
    }
    secciones[SECCION[p.tipo]] += c.precio;
    costo += c.netoMxn;
    enDestino += c.enDestino;
  }
  const servicios = secciones.hospedaje + secciones.vuelos + secciones.actividades + secciones.servicios;
  const subtotal = servicios + a.cargoServicio;
  const iva = a.conIva ? Math.round((subtotal * a.ivaPb) / 10_000) : 0;
  const total = subtotal + iva;
  const ganancia = subtotal - costo;
  return {
    secciones,
    cargoServicio: a.cargoServicio,
    subtotal,
    iva,
    total,
    porPersona: precioPorPersona(total, a.personas) ?? total,
    costo,
    ganancia,
    gananciaPb: subtotal > 0 ? Math.round((ganancia * 10_000) / subtotal) : 0,
    enDestino,
    pagosAiroo: total - enDestino,
    completo,
  };
}

// ─── Comisión de Airoo sobre viajes de asesoras ─────────────────────────────

/** 35% de la utilidad para Airoo; el resto, para la asesora. */
export function comision(utilidad: number, porcentajeAiroo: number) {
  const airoo = Math.round((utilidad * porcentajeAiroo) / 100);
  return { airoo, asesora: utilidad - airoo };
}

// ─── Plan de pagos del cliente ──────────────────────────────────────────────
// Aprobado el 10 oct (Fase-2-propuesta.md › 6.1 y 6.2):
// - El anticipo cubre lo que se paga al reservar y el cargo por servicio.
// - Un hotel con cancelación gratis y fecha de pago se divide en dos pagos.
// - El pago final vence 2 días antes de pagarle al hotel, pero nunca después de
//   15 días antes del viaje (lo que llegue primero). El segundo, una semana antes.
// - Si no da tiempo, se juntan: anticipo y pago final, o pago único.
// - En un viaje de solo hospedaje el hotel se divide en tres partes iguales y
//   la primera, con el cargo por servicio, es el anticipo.

export type Pago = { concepto: "Anticipo" | "Segundo pago" | "Pago final" | "Pago único"; monto: number; vence: string | null };

export function esFlexible(p: PartidaCalculo): boolean {
  return p.tipo === "hotel" && p.reembolsable && p.pagarAntes !== null && p.pagoProveedor === "al_reservar";
}

export function fechasFlexibles(
  partidas: PartidaCalculo[],
  inicio: string,
  diasAntesViaje: number,
): { segundo: string; final: string } | null {
  const limites = partidas.filter(esFlexible).map((p) => p.pagarAntes as string);
  if (limites.length === 0) return null;
  const antesDelHotel = sumarDias(limites.sort()[0], -2);
  const antesDelViaje = sumarDias(inicio, -diasAntesViaje);
  const final = antesDelHotel < antesDelViaje ? antesDelHotel : antesDelViaje;
  return { segundo: sumarDias(final, -7), final };
}

export function planDePagos(
  partidas: PartidaCalculo[],
  a: Ajustes & { inicio: string; hoy: string; diasAntesViaje: number },
): Pago[] {
  const t = totales(partidas, a);
  let flexible = 0;
  let resto = a.cargoServicio;
  for (const p of partidas) {
    const c = calcularPartida(p);
    if (c.precio === null) continue;
    if (esFlexible(p)) flexible += c.precio;
    else resto += c.precio - c.enDestino;
  }
  const soloHospedaje = partidas.length > 0 && partidas.every((p) => p.tipo === "hotel");
  const fechas = flexible > 0 ? fechasFlexibles(partidas, a.inicio, a.diasAntesViaje) : null;

  let plan: Pago[];
  if (!fechas || fechas.final <= a.hoy) {
    plan = [{ concepto: "Pago único", monto: resto + flexible, vence: null }];
  } else if (fechas.segundo > a.hoy) {
    if (soloHospedaje) {
      const tercio = Math.floor(flexible / 3);
      plan = [
        { concepto: "Anticipo", monto: resto + flexible - 2 * tercio, vence: null },
        { concepto: "Segundo pago", monto: tercio, vence: fechas.segundo },
        { concepto: "Pago final", monto: tercio, vence: fechas.final },
      ];
    } else {
      const mitad = Math.ceil(flexible / 2);
      plan = [
        { concepto: "Anticipo", monto: resto, vence: null },
        { concepto: "Segundo pago", monto: mitad, vence: fechas.segundo },
        { concepto: "Pago final", monto: flexible - mitad, vence: fechas.final },
      ];
    }
  } else {
    const anticipoHotel = soloHospedaje ? Math.ceil(flexible / 2) : 0;
    plan = [
      { concepto: "Anticipo", monto: resto + anticipoHotel, vence: null },
      { concepto: "Pago final", monto: flexible - anticipoHotel, vence: fechas.final },
    ];
  }

  // Con IVA, cada pago lleva su parte; el anticipo absorbe el redondeo para
  // que la suma sea exactamente lo que se le paga a Airoo.
  if (a.conIva && plan.length > 1) {
    const conIva = plan.map((p) => ({ ...p, monto: Math.round((p.monto * (10_000 + a.ivaPb)) / 10_000) }));
    conIva[0].monto = t.pagosAiroo - conIva.slice(1).reduce((s, p) => s + p.monto, 0);
    return conIva;
  }
  if (plan.length === 1) plan[0].monto = t.pagosAiroo;
  return plan;
}

// ─── Vigencia ───────────────────────────────────────────────────────────────

/**
 * Hasta cuándo valen los precios: los días de Configuración, sin pasar del
 * día antes de la primera fecha de pago al hotel.
 */
export function vigencia(hoy: string, dias: number, pagarAntes: (string | null)[]) {
  const propuesta = sumarDias(hoy, dias);
  const fechas = pagarAntes.filter((f): f is string => !!f).sort();
  const maxima = fechas.length ? sumarDias(fechas[0], -1) : null;
  return { propuesta: maxima && maxima < propuesta ? maxima : propuesta, maxima };
}

// ─── Huéspedes por habitación ───────────────────────────────────────────────

/**
 * Reparte a los viajeros en las habitaciones lo más parejo posible, primero
 * los adultos: 4 adultos y 2 menores en 2 habitaciones → 2+1 y 2+1.
 */
export function repartirHuespedes(adultos: number, menores: number, habitaciones: number) {
  const salida = Array.from({ length: habitaciones }, () => ({ adultos: 0, menores: 0 }));
  if (habitaciones === 0) return salida;
  for (let i = 0; i < adultos; i++) salida[i % habitaciones].adultos++;
  for (let i = 0; i < menores; i++) salida[(adultos + i) % habitaciones].menores++;
  return salida;
}

/** Personas de una habitación nueva: las que faltan por acomodar, hasta 4. */
export function huespedesNuevaHabitacion(
  viaje: { adultos: number; menores: number },
  acomodados: { adultos: number; menores: number }[],
) {
  const a = Math.max(0, viaje.adultos - acomodados.reduce((s, h) => s + h.adultos, 0));
  const m = Math.max(0, viaje.menores - acomodados.reduce((s, h) => s + h.menores, 0));
  const adultos = Math.min(a, 4);
  return { adultos, menores: Math.min(m, 4 - adultos) };
}

export const CAMAS = [
  "King",
  "Queen",
  "2 Queen",
  "2 dobles",
  "King + sofá cama",
  "2 dobles + sofá cama",
  "Matrimonial",
  "2 individuales",
] as const;
export type Cama = (typeof CAMAS)[number];

// ─── Noches ─────────────────────────────────────────────────────────────────

export const noches = (desde: string, hasta: string) => Math.max(0, diasEntre(desde, hasta));
