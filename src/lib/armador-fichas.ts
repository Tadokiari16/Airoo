// Lo que el armador sabe de cada registro del catálogo. Sin precios.

export type FichaHotelArmador = {
  tipo: "hotel";
  id: string;
  nombre: string;
  lugar: string;
  ciudadId: string;
  foto: string | null;
  regimenes: string[];
  soloAdultos: boolean;
  habitaciones: { id: string; nombre: string }[];
  /** Alta mínima desde el armador: falta completar su ficha. */
  porCompletar: boolean;
};

export type FichaActividadArmador = {
  tipo: "actividad";
  id: string;
  nombre: string;
  lugar: string;
  ciudadId: string;
  foto: string | null;
  duracion: string | null;
  inclusiones: string;
  cobro: "persona" | "edad" | "grupo" | "unidad" | null;
  llegada: "recogida" | "punto_encuentro" | "por_su_cuenta" | null;
  sePagaEnLugar: boolean;
  planes: { id: string; nombre: string }[];
  boletos: { id: string; nombre: string; edadDesde: number | null; edadHasta: number | null; gratis: boolean }[];
  porCompletar: boolean;
};

export type FichaServicioArmador = {
  tipo: "servicio";
  id: string;
  nombre: string;
  lugar: string;
  tipoServicio: "traslado" | "seguro" | "conectividad" | "equipo" | "reservacion";
  modeloCobro: "vehiculo" | "persona" | "persona_dia" | "unidad" | "dia" | "fijo";
  notaCobro: string | null;
  descripcion: string | null;
  variantes: { id: string; nombre: string; pasajeros: number | null; maletas: number | null; detalle: string | null }[];
};

export type FichaAerolineaArmador = {
  tipo: "vuelo";
  id: string;
  nombre: string;
  lugar: string;
  iata: string;
  tarifas: { id: string; nombre: string; detalle: string }[];
};

export type FichaArmador = FichaHotelArmador | FichaActividadArmador | FichaServicioArmador | FichaAerolineaArmador;

export type ResultadoCatalogo = {
  id: string;
  nombre: string;
  sub: string;
  ciudadId: string | null;
  usos: number;
};

/** Id del registro de catálogo de una partida. */
export function idCatalogo(p: {
  tipo: string;
  hotelId: string | null;
  actividadId: string | null;
  servicioId: string | null;
  aerolineaId: string | null;
}): string | null {
  if (p.tipo === "hotel") return p.hotelId;
  if (p.tipo === "actividad") return p.actividadId;
  if (p.tipo === "servicio") return p.servicioId;
  return p.aerolineaId;
}
