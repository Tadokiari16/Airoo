// Etapas del viaje y de quién es el turno. Los nombres son los del viaje
// (Viaje-Completo) en todas las pantallas: Fase-2-propuesta.md › 5.3.

export const ETAPAS = [
  { valor: "cotizacion", nombre: "Cotización" },
  { valor: "aprobada", nombre: "Aprobada" },
  { valor: "datos_y_pago", nombre: "Datos y pago" },
  { valor: "en_reservacion", nombre: "En reservación" },
  { valor: "reservada", nombre: "Reservada" },
  { valor: "en_viaje", nombre: "En viaje" },
  { valor: "finalizada", nombre: "Finalizada" },
  { valor: "cancelada", nombre: "Cancelada" },
] as const;
export type Etapa = (typeof ETAPAS)[number]["valor"];

/** Las seis de la barra del viaje. */
export const BARRA = ETAPAS.slice(0, 6);

export const nombreEtapa = (e: Etapa) => ETAPAS.find((x) => x.valor === e)!.nombre;

export type Turno = "Airoo" | "Cliente" | "Proveedor" | "Todo listo";

export type Situacion = {
  /** La línea de abajo de la etapa: «Sin enviar», «Con el cliente». */
  sub: string;
  turno: Turno;
  /** Para filtrar: en curso, borradores, finalizados o cancelados. */
  alcance: "curso" | "borr" | "fin" | "canc";
};

export function situacion(etapa: Etapa, estadoCotizacion: "borrador" | "enviada" | "aceptada" | "reemplazada"): Situacion {
  switch (etapa) {
    case "cotizacion":
      return estadoCotizacion === "borrador"
        ? { sub: "Sin enviar", turno: "Airoo", alcance: "borr" }
        : { sub: "Con el cliente", turno: "Cliente", alcance: "curso" };
    case "aprobada":
      return { sub: "Por revalidar", turno: "Airoo", alcance: "curso" };
    case "datos_y_pago":
      return { sub: "Con el cliente", turno: "Cliente", alcance: "curso" };
    case "en_reservacion":
      return { sub: "Reservando", turno: "Airoo", alcance: "curso" };
    case "reservada":
      return { sub: "Reserva completa", turno: "Todo listo", alcance: "curso" };
    case "en_viaje":
      return { sub: "En destino", turno: "Todo listo", alcance: "curso" };
    case "finalizada":
      return { sub: "Viaje completado", turno: "Todo listo", alcance: "fin" };
    case "cancelada":
      return { sub: "Sin cobro", turno: "Todo listo", alcance: "canc" };
  }
}

export const ALCANCES = [
  { valor: "curso", nombre: "En curso" },
  { valor: "borr", nombre: "Borradores" },
  { valor: "fin", nombre: "Finalizados" },
  { valor: "canc", nombre: "Cancelados" },
  { valor: "todos", nombre: "Todos" },
] as const;
export type Alcance = (typeof ALCANCES)[number]["valor"];

/**
 * «En curso» incluye los borradores: en la Fase 2a todavía no se envía nada y
 * un viaje recién creado tiene que aparecer en la lista de entrada.
 */
export function entraEnAlcance(alcance: Alcance, de: Situacion["alcance"]): boolean {
  if (alcance === "todos") return true;
  if (alcance === "curso") return de === "curso" || de === "borr";
  return alcance === de;
}

export const folioTexto = (folio: number) => `AIR-${folio}`;

/** «4 adultos y 2 menores», «2 adultos», «1 adulto y 1 menor». */
export function textoViajeros(adultos: number, menores: number): string {
  const a = `${adultos} ${adultos === 1 ? "adulto" : "adultos"}`;
  return menores ? `${a} y ${menores} ${menores === 1 ? "menor" : "menores"}` : a;
}

export const textoPersonas = (n: number) => `${n} ${n === 1 ? "persona" : "personas"}`;
export const textoNoches = (n: number) => `${n} ${n === 1 ? "noche" : "noches"}`;
