// Reglas de la ficha de servicio que no dependen de la base de datos: los
// tipos, cómo se cobra cada uno, cómo se llaman sus variantes, qué va a pedir
// el armador y qué le falta a la ficha. Es el patrón de la ficha de actividad,
// más corto: sin fotos y sin bloques que se encienden.

export const TIPOS = [
  { valor: "traslado", nombre: "Traslado", grupo: "traslados" },
  { valor: "seguro", nombre: "Seguro", grupo: "seguros" },
  { valor: "conectividad", nombre: "Conectividad", grupo: "extras" },
  { valor: "equipo", nombre: "Equipo", grupo: "extras" },
  { valor: "reservacion", nombre: "Reservación", grupo: "extras" },
] as const;
export type TipoServicio = (typeof TIPOS)[number]["valor"];
export type GrupoServicio = (typeof TIPOS)[number]["grupo"];
export const VALORES_TIPO = TIPOS.map((t) => t.valor) as TipoServicio[];
export const nombreTipo = (t: string) => TIPOS.find((x) => x.valor === t)?.nombre ?? t;
export const grupoDe = (t: TipoServicio): GrupoServicio => TIPOS.find((x) => x.valor === t)!.grupo;

export const MODELOS = [
  {
    valor: "vehiculo",
    nombre: "Por vehículo",
    sub: "Precio por traslado",
    pista: "Un precio por vehículo y trayecto, sin importar cuántas personas van dentro.",
    pide: ["Origen y destino", "Fecha y hora", "Sencillo o redondo"],
  },
  {
    valor: "persona",
    nombre: "Por persona",
    sub: "Precio por persona",
    pista: "Un precio por cada persona que lo usa.",
    pide: ["Número de personas"],
  },
  {
    valor: "persona_dia",
    nombre: "Por persona y día",
    sub: "Por persona y días",
    pista: "Un precio por persona por cada día de vigencia.",
    pide: ["Número de personas", "Días de vigencia"],
  },
  {
    valor: "unidad",
    nombre: "Por unidad",
    sub: "Por cada una",
    pista: "Un precio por cada una; no todos los viajeros la necesitan.",
    pide: ["Cantidad"],
  },
  {
    valor: "dia",
    nombre: "Por día",
    sub: "Por días de renta",
    pista: "Un precio por día, de la entrega a la devolución.",
    pide: ["Fechas de entrega y devolución"],
  },
  {
    valor: "fijo",
    nombre: "Cargo fijo",
    sub: "Monto único",
    pista: "Un solo monto por servicio, sin importar personas ni días.",
    pide: ["Fecha"],
  },
] as const;
export type ModeloCobro = (typeof MODELOS)[number]["valor"];
export const VALORES_MODELO = MODELOS.map((m) => m.valor) as ModeloCobro[];
export const modelo = (m: ModeloCobro) => MODELOS.find((x) => x.valor === m)!;

/** El modelo con el que se abre un servicio nuevo de ese tipo. Se cambia en la ficha. */
export const MODELO_SUGERIDO: Record<TipoServicio, ModeloCobro> = {
  traslado: "vehiculo",
  seguro: "persona_dia",
  conectividad: "unidad",
  equipo: "dia",
  reservacion: "fijo",
};

/**
 * Cómo se llaman las variantes de cada tipo. Los traslados llevan pasajeros
 * y maletas; los demás, un detalle en texto libre.
 */
export const VARIANTES: Record<
  TipoServicio,
  { titulo: string; una: string; varias: string; detalle: string; ejemplo: string; ejemploDetalle: string }
> = {
  traslado: {
    titulo: "Unidades",
    una: "unidad",
    varias: "unidades",
    detalle: "Detalle",
    ejemplo: "Ej. Van privada",
    ejemploDetalle: "Ej. rampa",
  },
  seguro: {
    titulo: "Planes",
    una: "plan",
    varias: "planes",
    detalle: "Cobertura",
    ejemplo: "Ej. Básico",
    ejemploDetalle: "Ej. Gastos médicos hasta USD 30,000 · médico y equipaje",
  },
  conectividad: {
    titulo: "Planes",
    una: "plan",
    varias: "planes",
    detalle: "Qué incluye",
    ejemplo: "Ej. Europa",
    ejemploDetalle: "Ej. 20 GB · 15 días",
  },
  equipo: {
    titulo: "Tipos",
    una: "tipo",
    varias: "tipos",
    detalle: "Detalle",
    ejemplo: "Ej. Estándar",
    ejemploDetalle: "Ej. Depósito reembolsable al recibirla",
  },
  reservacion: {
    titulo: "Tipos",
    una: "tipo",
    varias: "tipos",
    detalle: "Qué paga el cliente",
    ejemplo: "Ej. Solo reservación",
    ejemploDetalle: "Ej. Cargo por gestión de Airoo",
  },
};

const plural = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** «4 unidades», «3 planes», «Sin tipos». */
export function textoVariantes(tipo: TipoServicio, n: number): string {
  const v = VARIANTES[tipo];
  return n ? plural(n, v.una, v.varias) : `Sin ${v.varias}`;
}

/** «Hasta 6», «Hasta 6 · rampa», o el detalle solo. */
export function textoPasajeros(n: number | null, detalle?: string | null): string {
  return [n ? `Hasta ${n}` : null, detalle || null].filter(Boolean).join(" · ") || "—";
}

/** Lo que el armador va a pedir con este modelo y estas variantes, además del precio. */
export function queSePide(s: { tipo: TipoServicio; modeloCobro: ModeloCobro; variantes: number }): string[] {
  const v = VARIANTES[s.tipo];
  return [...(s.variantes ? [mayuscula(v.una)] : []), ...modelo(s.modeloCobro).pide];
}

export type RevisionServicio = { clave: string; ok: boolean; falta: string };

export function revisarServicio(s: {
  tipo: TipoServicio;
  modeloCobro: ModeloCobro;
  descripcion: string | null;
  clienteRecibe: string | null;
  variantes: number;
  proveedores: number;
  variaPorReserva: boolean;
}): RevisionServicio[] {
  const r: RevisionServicio[] = [
    { clave: "descripcion", ok: !!s.descripcion?.trim(), falta: "Falta lo que ve el cliente" },
    { clave: "recibe", ok: !!s.clienteRecibe?.trim(), falta: "Falta qué recibe el cliente" },
    {
      clave: "proveedor",
      ok: s.variaPorReserva || s.proveedores > 0,
      falta: "Falta el proveedor",
    },
  ];
  // Sin unidades no se puede elegir vehículo al cotizar un traslado.
  if (s.modeloCobro === "vehiculo")
    r.push({ clave: "variantes", ok: s.variantes > 0, falta: `Faltan las ${VARIANTES[s.tipo].varias}` });
  return r;
}

export function textoFicha(revision: RevisionServicio[]): string {
  const faltan = revision.filter((r) => !r.ok);
  if (faltan.length === 0) return "Completa";
  if (faltan.length === 1) return faltan[0].falta;
  return `Faltan ${faltan.length} cosas`;
}
