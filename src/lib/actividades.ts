// Reglas de la ficha de actividad que no dependen de la base de datos: los
// tipos, los 8 bloques opcionales, qué bloques sugiere cada tipo, qué va a
// pedir el armador y qué le falta a la ficha.

import { evaluarPortada } from "./fotos";

export const TIPOS = [
  { valor: "tour", nombre: "Tour", corto: "Tour" },
  { valor: "excursion", nombre: "Excursión", corto: "Excursión" },
  { valor: "parque", nombre: "Parque o entrada", corto: "Parque" },
  { valor: "day_pass", nombre: "Day pass", corto: "Day pass" },
  { valor: "experiencia", nombre: "Experiencia", corto: "Experiencia" },
  { valor: "espectaculo", nombre: "Espectáculo", corto: "Espectáculo" },
  { valor: "otro", nombre: "Otro", corto: "Otro" },
] as const;
export type TipoActividad = (typeof TIPOS)[number]["valor"];
export const VALORES_TIPO = TIPOS.map((t) => t.valor) as TipoActividad[];
export const nombreTipo = (t: string) => TIPOS.find((x) => x.valor === t)?.nombre ?? t;
export const cortoTipo = (t: string) => TIPOS.find((x) => x.valor === t)?.corto ?? t;

export const CLAVES_BLOQUE = [
  "cobro",
  "planes",
  "boletos",
  "horarios",
  "llegada",
  "incluye",
  "requisitos",
  "confirmacion",
] as const;
export type Bloque = (typeof CLAVES_BLOQUE)[number];

export const BLOQUES: Record<Bloque, { titulo: string; sub: string; chip: string }> = {
  cobro: {
    titulo: "Cómo se cobra",
    sub: "Le dice al armador qué renglones pedir para capturar el precio.",
    chip: "Cómo se cobra",
  },
  planes: {
    titulo: "Planes",
    sub: "Variantes con nombre que ve el cliente; en cada cotización se elige una.",
    chip: "Planes",
  },
  boletos: {
    titulo: "Boletos por edad",
    sub: "Categorías y rangos de edad de este proveedor.",
    chip: "Boletos por edad",
  },
  horarios: { titulo: "Horarios", sub: "Salidas fijas u horario abierto.", chip: "Horarios" },
  llegada: {
    titulo: "Cómo llega el cliente",
    sub: "Recogida en hotel, punto de encuentro o por su cuenta.",
    chip: "Cómo llega",
  },
  incluye: {
    titulo: "Incluye, no incluye y qué llevar",
    sub: "Lo que ve el cliente; se puede ajustar en cada cotización.",
    chip: "Incluye",
  },
  requisitos: {
    titulo: "Requisitos",
    sub: "Identificación, tarifa nacional, edad o estatura mínima, condiciones de salud.",
    chip: "Requisitos",
  },
  confirmacion: {
    titulo: "Cómo se confirma",
    sub: "Qué documento recibe el cliente.",
    chip: "Cómo se confirma",
  },
};

/** Los bloques que suele necesitar cada tipo (del prototipo). */
export const SUGERIDOS: Record<TipoActividad, Bloque[]> = {
  parque: ["cobro", "boletos", "horarios", "llegada", "incluye", "requisitos", "confirmacion"],
  tour: ["cobro", "horarios", "llegada", "incluye", "confirmacion"],
  excursion: ["cobro", "planes", "horarios", "llegada", "incluye", "confirmacion"],
  day_pass: ["cobro", "planes", "horarios", "llegada", "incluye", "confirmacion"],
  experiencia: ["cobro", "horarios", "llegada", "incluye"],
  espectaculo: ["cobro", "planes", "horarios", "confirmacion"],
  otro: ["cobro"],
};

/**
 * Al cambiar el tipo se encienden los bloques sugeridos para el nuevo tipo y
 * no se apaga ninguno: los que ya estaban encendidos siguen igual.
 */
export function cambiarTipo(bloques: readonly string[], nuevo: TipoActividad): Bloque[] {
  const encendidos = new Set([...bloques, ...SUGERIDOS[nuevo]]);
  return CLAVES_BLOQUE.filter((b) => encendidos.has(b));
}

export const COBROS = [
  {
    valor: "persona",
    nombre: "Por persona",
    pista: "En el armador: cuántas personas y un precio por persona.",
    pide: "Cuántas personas",
  },
  {
    valor: "edad",
    nombre: "Por edad",
    pista: "En el armador: un renglón por cada boleto de «Boletos por edad», con su precio.",
    pide: "Cuántos boletos de cada edad",
  },
  {
    valor: "grupo",
    nombre: "Por grupo",
    pista: "En el armador: un precio por grupo, hasta el máximo de personas que se indique.",
    pide: "Cuántas personas en el grupo",
  },
  {
    valor: "unidad",
    nombre: "Por unidad",
    pista: "En el armador: cuántas unidades (cama, lancha, cabaña) y un precio por unidad.",
    pide: "Cuántas unidades",
  },
] as const;
export type Cobro = (typeof COBROS)[number]["valor"];

export const HORARIOS = [
  { valor: "abierto", nombre: "Horario abierto", pista: "" },
  { valor: "salidas", nombre: "Salidas fijas", pista: "En el armador se elige la salida." },
] as const;
export type Horario = (typeof HORARIOS)[number]["valor"];

export const LLEGADAS = [
  {
    valor: "recogida",
    nombre: "Recogida en hotel",
    pista: "En el armador se pide el hotel de recogida y la hora.",
  },
  { valor: "punto_encuentro", nombre: "Punto de encuentro", pista: "" },
  { valor: "por_su_cuenta", nombre: "Por su cuenta", pista: "" },
] as const;
export type Llegada = (typeof LLEGADAS)[number]["valor"];

export const CONFIRMACIONES = [
  { valor: "bono", nombre: "Bono del proveedor", pista: "Se sube al viaje tal cual, sin recortar el QR." },
  {
    valor: "lista_nombres",
    nombre: "Lista de nombres",
    pista: "El proveedor recibe los nombres; el cliente se identifica al llegar.",
  },
  {
    valor: "pago_taquilla",
    nombre: "Pago en taquilla",
    pista: "El cliente paga al llegar; no hay pago de Airoo.",
  },
] as const;
export type Confirmacion = (typeof CONFIRMACIONES)[number]["valor"];

export const nombreDe = <T extends { valor: string; nombre: string }>(
  lista: readonly T[],
  v: string | null,
) => lista.find((x) => x.valor === v)?.nombre ?? "";

/** «12 años o más», «5 a 11 años», «0 a 4 años · gratis». */
export function textoEdad(b: {
  edadDesde: number | null;
  edadHasta: number | null;
  gratis: boolean;
}): string {
  const { edadDesde: d, edadHasta: h } = b;
  const edad =
    d != null && h != null
      ? `${d} a ${h} años`
      : d != null
        ? `${d} años o más`
        : h != null
          ? `Hasta ${h} años`
          : "Sin distinción de edad";
  return b.gratis ? `${edad} · gratis` : edad;
}

export type ResumenActividad = {
  bloques: readonly string[];
  cobro: Cobro | null;
  horarioTipo: Horario | null;
  llegada: Llegada | null;
  sePagaEnLugar: boolean;
};

/** «En el armador se va a pedir»: solo cuenta lo que está encendido. */
export function queSePide(a: ResumenActividad): string[] {
  const on = (b: Bloque) => a.bloques.includes(b);
  const pide: string[] = [];
  if (!a.sePagaEnLugar) pide.push("De qué proveedor sale la tarifa");
  if (on("planes")) pide.push("Qué plan");
  if (on("cobro") && a.cobro) pide.push(COBROS.find((c) => c.valor === a.cobro)!.pide);
  if (on("horarios") && a.horarioTipo === "salidas") pide.push("Qué salida");
  if (on("llegada") && a.llegada === "recogida") pide.push("Hotel y hora de recogida");
  pide.push("Fecha");
  return pide;
}

// ─── Qué le falta a la ficha ─────────────────────────────────────────────────

export type FichaActividad = ResumenActividad & {
  portada: { ancho: number; alto: number } | null;
  fotosGaleria: number;
  descripcion: string | null;
  duracion: string | null;
  proveedores: number;
  planes: number;
  boletos: number;
  salidas: number;
  maxPersonasGrupo: number | null;
};

export type RevisionActividad = {
  clave:
    | "portada"
    | "galeria"
    | "descripcion"
    | "duracion"
    | "proveedor"
    | "cobro"
    | "planes"
    | "boletos"
    | "salidas";
  ok: boolean;
  falta: string;
};

export const GALERIA_MINIMA = 5;

/**
 * Lo que la propuesta necesita para verse completa y lo que el armador
 * necesita para pedir lo que dicen los bloques encendidos.
 */
export function revisarActividad(a: FichaActividad): RevisionActividad[] {
  const on = (b: Bloque) => a.bloques.includes(b);
  const portada = a.portada ? evaluarPortada(a.portada.ancho, a.portada.alto) : null;
  const r: RevisionActividad[] = [
    {
      clave: "portada",
      ok: portada?.estado === "lista",
      falta: portada ? "Portada por ajustar" : "Falta la portada",
    },
    {
      clave: "galeria",
      ok: a.fotosGaleria >= GALERIA_MINIMA,
      falta:
        a.fotosGaleria === 0
          ? "Sin fotos en la galería"
          : `Tiene ${a.fotosGaleria} ${a.fotosGaleria === 1 ? "foto" : "fotos"}; la propuesta se ve mejor con ${GALERIA_MINIMA}`,
    },
    { clave: "descripcion", ok: !!a.descripcion?.trim(), falta: "Falta descripción" },
    { clave: "duracion", ok: !!a.duracion?.trim(), falta: "Falta la duración" },
    {
      clave: "proveedor",
      ok: a.sePagaEnLugar || a.proveedores > 0,
      falta: "Sin proveedor ligado",
    },
  ];
  if (on("cobro"))
    r.push({
      clave: "cobro",
      ok: !!a.cobro && (a.cobro !== "grupo" || !!a.maxPersonasGrupo),
      falta: a.cobro ? "Falta el máximo de personas del grupo" : "Falta elegir cómo se cobra",
    });
  if (on("planes")) r.push({ clave: "planes", ok: a.planes > 0, falta: "Faltan los planes" });
  if (on("boletos")) r.push({ clave: "boletos", ok: a.boletos > 0, falta: "Faltan los boletos por edad" });
  if (on("horarios") && a.horarioTipo === "salidas")
    r.push({ clave: "salidas", ok: a.salidas > 0, falta: "Faltan las horas de salida" });
  return r;
}

/** Lo que dice la columna «Ficha» de la lista. */
export function textoFicha(revision: RevisionActividad[]): string {
  const faltan = revision.filter((r) => !r.ok);
  if (faltan.length === 0) return "Completa";
  if (faltan.length === 1) return faltan[0].falta;
  const textos = faltan.map((r) => r.falta).sort();
  const sinFotosNiDescripcion = ["Falta descripción", "Falta la portada", "Sin fotos en la galería"];
  if (textos.join("|") === sinFotosNiDescripcion.join("|")) return "Sin fotos ni descripción";
  return `Faltan ${faltan.length} cosas`;
}

/** Columna «Cómo se cobra» de la lista: título y detalle. */
export function textoCobro(a: {
  bloques: readonly string[];
  cobro: Cobro | null;
  planes: string[];
  boletos: string[];
  maxPersonasGrupo: number | null;
}): { titulo: string; sub: string } {
  const planes = a.bloques.includes("planes") && a.planes.length;
  const subPlanes = planes ? `${a.planes.length} ${a.planes.length === 1 ? "plan" : "planes"}` : "Sin planes";
  if (!a.bloques.includes("cobro") || !a.cobro) return { titulo: "Sin definir", sub: subPlanes };
  const titulo = nombreDe(COBROS, a.cobro);
  if (a.cobro === "edad")
    return { titulo, sub: a.boletos.length ? a.boletos.join(" · ") : "Sin boletos todavía" };
  if (a.cobro === "grupo")
    return { titulo, sub: a.maxPersonasGrupo ? `Hasta ${a.maxPersonasGrupo} personas` : subPlanes };
  return { titulo, sub: subPlanes };
}
