// Reglas de la ficha del hotel que no dependen de la base de datos: qué le
// falta para que la propuesta se vea completa, cómo se escriben los cargos y
// cómo se lee el ID de Tripadvisor.

import { formatoDinero, type Moneda } from "./dinero";
import { evaluarPortada } from "./fotos";

export const REGIMENES = [
  { clave: "RO", nombre: "Solo habitación" },
  { clave: "BB", nombre: "Desayuno" },
  { clave: "HB", nombre: "Media pensión" },
  { clave: "FB", nombre: "Pensión completa" },
  { clave: "AI", nombre: "Todo incluido" },
] as const;
export type Regimen = (typeof REGIMENES)[number]["clave"];
export const CLAVES_REGIMEN = REGIMENES.map((r) => r.clave) as Regimen[];

export const nombreRegimen = (clave: string) => REGIMENES.find((r) => r.clave === clave)?.nombre ?? clave;

export const SE_COBRA = [
  { valor: "habitacion_noche", nombre: "Por habitación, por noche", corto: "por habitación por noche" },
  { valor: "persona_noche", nombre: "Por persona, por noche", corto: "por persona por noche" },
  { valor: "estancia", nombre: "Por estancia", corto: "por estancia" },
] as const;
export type SeCobra = (typeof SE_COBRA)[number]["valor"];

/** «$69 por habitación por noche», «€2.50 por persona por noche». */
export function textoCargo(c: { montoCentavos: number; moneda: Moneda; seCobra: SeCobra }): string {
  const como = SE_COBRA.find((s) => s.valor === c.seCobra)?.corto ?? "";
  return `${formatoDinero(c.montoCentavos, c.moneda)} ${como}`;
}

/** «15:00» o «15:00:00» → «3:00 PM». */
export function horaCliente(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

/**
 * Acepta el número o la dirección completa de la página del hotel:
 * «…/Hotel_Review-g150807-d1234517-Reviews-…» → «1234517».
 */
export function idTripadvisor(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  if (/^\d{4,12}$/.test(t)) return t;
  const m = t.match(/-d(\d{4,12})(?:-|$|\.)/);
  return m ? m[1] : null;
}

export const ligaTripadvisor = (id: string) => `https://www.tripadvisor.com.mx/Hotel_Review-d${id}-Reviews`;

/** Calificación en décimas (45) → «4.5». */
export const textoCalificacion = (decimas: number) => (decimas / 10).toFixed(1);

/** Las cinco bolitas de Tripadvisor: llena, media o vacía. */
export function bolitas(decimas: number): ("llena" | "media" | "vacia")[] {
  return [1, 2, 3, 4, 5].map((i) =>
    decimas >= i * 10 ? "llena" : decimas >= i * 10 - 5 ? "media" : "vacia",
  );
}

// ─── Qué le falta a la ficha ─────────────────────────────────────────────────

export type ResumenFicha = {
  portada: { ancho: number; alto: number } | null;
  fotosGaleria: number;
  descripcion: string | null;
  direccion: string | null;
  ligaMaps: string | null;
  habitaciones: { fotos: number; nombres: number }[];
  tripadvisorId: string | null;
  tripadvisorCalificacion: number | null;
  cargos: number;
  sinCargos: boolean;
  telefonoReservaciones: string | null;
  correoReservaciones: string | null;
};

export type Revision = {
  clave:
    | "portada"
    | "galeria"
    | "descripcion"
    | "direccion"
    | "fotos_hab"
    | "nombres"
    | "tripadvisor"
    | "cargos"
    | "reservaciones";
  nombre: string;
  valor: string;
  ok: boolean;
  /** Lo que se muestra en la lista cuando falta. */
  falta: string;
};

/** Con 5 fotos en la galería la propuesta ya se ve completa. */
export const GALERIA_MINIMA = 5;

/** Los 9 puntos de «Ficha · N de 9», en el orden del prototipo. */
export function revisarFicha(h: ResumenFicha): Revision[] {
  const portada = h.portada ? evaluarPortada(h.portada.ancho, h.portada.alto) : null;
  const nHab = h.habitaciones.length;
  const conFotos = h.habitaciones.filter((r) => r.fotos > 0).length;
  const nombres = h.habitaciones.reduce((a, r) => a + r.nombres, 0);
  const sinNombre = h.habitaciones.filter((r) => r.nombres === 0).length;
  return [
    {
      clave: "portada",
      nombre: "Portada 16:9",
      valor: !portada ? "falta" : portada.estado === "lista" ? "" : "por ajustar",
      ok: portada?.estado === "lista",
      falta: portada ? "Portada por ajustar" : "Falta la portada",
    },
    {
      clave: "galeria",
      nombre: "Galería",
      valor: String(h.fotosGaleria),
      ok: h.fotosGaleria >= GALERIA_MINIMA,
      falta:
        h.fotosGaleria === 0
          ? "Sin fotos"
          : `Tiene ${h.fotosGaleria} ${h.fotosGaleria === 1 ? "foto" : "fotos"}; la propuesta se ve mejor con ${GALERIA_MINIMA}`,
    },
    {
      clave: "descripcion",
      nombre: "Descripción",
      valor: "",
      ok: !!h.descripcion?.trim(),
      falta: "Falta descripción",
    },
    {
      clave: "direccion",
      nombre: "Dirección y mapa",
      valor: "",
      ok: !!h.direccion?.trim() && !!h.ligaMaps?.trim(),
      falta: h.direccion?.trim() ? "Falta la liga de Google Maps" : "Falta la dirección",
    },
    {
      clave: "fotos_hab",
      nombre: "Fotos por habitación",
      valor: nHab ? `${conFotos} de ${nHab}` : "sin habitaciones",
      ok: nHab > 0 && conFotos === nHab,
      falta:
        nHab === 0
          ? "Faltan habitaciones"
          : `${nHab - conFotos} ${nHab - conFotos === 1 ? "habitación" : "habitaciones"} sin fotos`,
    },
    {
      clave: "nombres",
      nombre: "Nombres en plataformas",
      valor: String(nombres),
      ok: nHab > 0 && sinNombre === 0,
      falta: nHab === 0 ? "Faltan habitaciones" : "Falta un nombre de proveedor",
    },
    {
      clave: "tripadvisor",
      nombre: "Tripadvisor",
      valor: h.tripadvisorCalificacion ? textoCalificacion(h.tripadvisorCalificacion) : "",
      ok: !!h.tripadvisorId && !!h.tripadvisorCalificacion,
      falta: h.tripadvisorId ? "Falta la calificación de Tripadvisor" : "Falta ID de Tripadvisor",
    },
    {
      clave: "cargos",
      nombre: "Cargos en el hotel",
      valor: h.sinCargos ? "no cobra" : String(h.cargos),
      ok: h.cargos > 0 || h.sinCargos,
      falta: "Faltan cargos en el hotel",
    },
    {
      clave: "reservaciones",
      nombre: "Teléfono de reservaciones",
      valor: "",
      ok: !!h.telefonoReservaciones?.trim() || !!h.correoReservaciones?.trim(),
      falta: "Falta el teléfono de reservaciones",
    },
  ];
}

/** Lo que dice la columna «Ficha» de la lista. */
export function textoFicha(revision: Revision[]): string {
  const faltan = revision.filter((r) => !r.ok);
  if (faltan.length === 0) return "Completa";
  if (faltan.length === 1) return faltan[0].falta;
  return `Faltan ${faltan.length} cosas`;
}
