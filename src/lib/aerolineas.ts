// Reglas del catálogo de aerolíneas que no dependen de la base de datos:
// equipaje, ventanas de check-in con su fuente y búsqueda en la lista IATA.
// Las aerolíneas no son proveedores.

import { normalizar } from "./texto";

export type Tarifa = {
  nombre: string;
  mano: string | null;
  documentada: string | null;
  cambios: string | null;
};

export const RUTAS = [
  { valor: "nacional", nombre: "Nacional" },
  { valor: "internacional", nombre: "Internacional" },
] as const;
export type Ruta = (typeof RUTAS)[number]["valor"];

export type Fuente = "verificado" | "terceros" | "sin_fuente";

export type Ventana = {
  ruta: Ruta;
  abre: string | null;
  cierra: string | null;
  fuente: Fuente;
  fuenteTexto: string | null;
};

/** «Guía de terceros (eSky)», «Sin fuente todavía». La verificada lleva quién y cuándo aparte. */
export function textoFuente(v: Pick<Ventana, "fuente" | "fuenteTexto">): string {
  if (v.fuente === "verificado") return "Verificado con una reserva real";
  if (v.fuente === "terceros")
    return v.fuenteTexto ? `Guía de terceros (${v.fuenteTexto})` : "Guía de terceros";
  return "Sin fuente todavía";
}

const kilos = (t: string) => Number(/(\d+(?:[.,]\d+)?)\s*kg/i.exec(t)?.[1].replace(",", ".") ?? NaN);

/** Columna «Equipaje documentado»: el máximo y desde qué tarifa se incluye. */
export function textoEquipaje(tarifas: Tarifa[]): { titulo: string; sub: string } {
  if (tarifas.length === 0) return { titulo: "Sin tarifas", sub: "Se agregan en el panel" };
  const con = tarifas.filter((t) => t.documentada?.trim());
  if (con.length === 0) return { titulo: "No incluye", sub: "Ninguna tarifa lo incluye" };
  const mayor = con.reduce((a, b) => (kilos(b.documentada!) > kilos(a.documentada!) ? b : a));
  return { titulo: `Hasta ${mayor.documentada}`, sub: `Desde la tarifa ${con[0].nombre}` };
}

/** Columna «Check-in»: cuántas ventanas falta verificar con una reserva real. */
export function textoCheckin(ventanas: Pick<Ventana, "fuente">[]): {
  titulo: string;
  sub: string;
  pendientes: number;
} {
  const pendientes = ventanas.filter((v) => v.fuente !== "verificado").length;
  if (pendientes === 0) return { titulo: "Verificado", sub: "Con una reserva real", pendientes };
  return {
    titulo: `${pendientes} ${pendientes === 1 ? "ventana por verificar" : "ventanas por verificar"}`,
    sub: ventanas.every((v) => v.fuente === "sin_fuente") ? "Sin fuente todavía" : "Fuentes de terceros",
    pendientes,
  };
}

/** Código IATA de aerolínea: dos letras o números, en mayúsculas. */
export function limpiarIata(codigo: string): string | null {
  const c = codigo.trim().toUpperCase();
  return /^[A-Z0-9]{2}$/.test(c) ? c : null;
}

export type AerolineaIata = { iata: string; nombre: string; pais: string | null };

/**
 * Busca en la lista IATA por código o nombre. Primero el código exacto,
 * luego los nombres que empiezan con lo escrito, luego los que lo contienen.
 */
export function buscarIata(lista: AerolineaIata[], q: string, limite = 8): AerolineaIata[] {
  const n = normalizar(q);
  if (!n) return [];
  const codigo = q.trim().toUpperCase();
  const puntos = (a: AerolineaIata) => {
    const nombre = normalizar(a.nombre);
    if (a.iata === codigo) return 0;
    if (nombre.startsWith(n)) return 1;
    if (nombre.split(" ").some((p) => p.startsWith(n))) return 2;
    if (nombre.includes(n)) return 3;
    return 9;
  };
  return lista
    .map((a) => ({ a, p: puntos(a) }))
    .filter((x) => x.p < 9)
    .sort((x, y) => x.p - y.p || x.a.nombre.localeCompare(y.a.nombre, "es"))
    .slice(0, limite)
    .map((x) => x.a);
}

/** «2 h en nacional, 3 h en internacional» */
export function textoLlegarAntes(horas: { nacional: number; internacional: number }): string {
  return `${horas.nacional} h en nacional, ${horas.internacional} h en internacional`;
}
