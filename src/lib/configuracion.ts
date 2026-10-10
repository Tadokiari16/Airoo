// Ajustes de la agencia (tabla `configuracion`: una fila por clave, valor JSON).
// Reglas puras, sin acceso a la base, para poder probarlas solas.

import { z } from "zod";
import { formatoDinero } from "./dinero";

/** Los valores de fábrica. La semilla los guarda; si falta una fila, se usa este. */
export const AJUSTES_INICIALES = {
  ganancia_defecto: { hoteles: 10, actividades: 10, vuelos: 2.5 },
  cargo_servicio: { centavos: 25000, moneda: "MXN", por: "viaje" },
  iva: { porcentaje: 16, cuando: "solo_factura" },
  tolerancia_precio: { centavos: 30000, moneda: "MXN", por: "servicio" },
  colchon_tipo_cambio: { porcentaje: 1.5 },
  plazo_datos_y_pago: { horas: 3 },
  vigencia_cotizacion: { dias: 7 },
  pagos_flexibles: { dias_antes: 15 },
  recordatorios_cliente: { dias_antes: [3, 1] },
  aviso_pago_proveedor: { dias_antes: 1 },
  comision_airoo: { porcentaje_de_utilidad: 35 },
  credito_airoo: { meses_vigencia: 12 },
  llegar_aeropuerto: { nacional_horas: 2, internacional_horas: 3 },
  agencia: {
    nombre_comercial: "Airoo",
    whatsapp: "",
    horario: "Lun–Sáb · 9 AM – 7 PM",
    durante_viaje: "",
  },
};

export type Ajustes = typeof AJUSTES_INICIALES;
export type ClaveAjuste = keyof Ajustes;

const porcentaje = (max: number) =>
  z
    .number({ error: "Falta el porcentaje." })
    .min(0, "El porcentaje no puede ser negativo.")
    .max(max, `Hasta ${max}%.`)
    .refine((n) => Number.isInteger(n * 100), "Hasta dos decimales.");
const centavos = (max: number) =>
  z
    .number({ error: "Falta el monto." })
    .int("El monto va en centavos enteros.")
    .min(0, "El monto no puede ser negativo.")
    .max(max, `Hasta ${formatoDinero(max)}.`);
const dias = (min: number, max: number) =>
  z
    .number({ error: "Faltan los días." })
    .int("Días completos.")
    .min(min, `Al menos ${min} ${min === 1 ? "día" : "días"}.`)
    .max(max, `Hasta ${max} días.`);

export const COLCHONES = [0, 1, 1.5, 2] as const;
export const PLAZOS_DATOS_Y_PAGO = [1, 2, 3] as const;
export const RECORDATORIOS = [
  { valor: [3, 1], etiqueta: "3 días y 1 día antes" },
  { valor: [3, 0], etiqueta: "3 días antes y el mismo día" },
  { valor: [1], etiqueta: "1 día antes" },
] as const;

/** Lo que se acepta guardar en cada clave que se edita desde Configuración. */
export const ESQUEMAS = {
  ganancia_defecto: z.object({
    hoteles: porcentaje(100),
    actividades: porcentaje(100),
    vuelos: porcentaje(100),
  }),
  cargo_servicio: z.object({
    centavos: centavos(10_000_00),
    moneda: z.literal("MXN"),
    por: z.literal("viaje"),
  }),
  tolerancia_precio: z.object({
    centavos: centavos(10_000_00),
    moneda: z.literal("MXN"),
    por: z.literal("servicio"),
  }),
  colchon_tipo_cambio: z.object({
    porcentaje: z
      .number()
      .refine((n) => (COLCHONES as readonly number[]).includes(n), "Elige 0%, 1%, 1.5% o 2%."),
  }),
  plazo_datos_y_pago: z.object({
    horas: z
      .number()
      .refine((n) => (PLAZOS_DATOS_Y_PAGO as readonly number[]).includes(n), "Entre 1 y 3 horas."),
  }),
  vigencia_cotizacion: z.object({ dias: dias(1, 30) }),
  pagos_flexibles: z.object({ dias_antes: dias(1, 90) }),
  recordatorios_cliente: z.object({
    dias_antes: z
      .array(z.number())
      .refine(
        (v) => RECORDATORIOS.some((r) => r.valor.join() === v.join()),
        "Esa combinación de recordatorios no está en la lista.",
      ),
  }),
  aviso_pago_proveedor: z.object({ dias_antes: dias(1, 15) }),
  agencia: z.object({
    nombre_comercial: z.string().trim().min(2, "Falta el nombre comercial.").max(60),
    whatsapp: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\+?\d{10,15}$/.test(v.replace(/[\s()-]/g, "")), {
        message: "El WhatsApp lleva 10 dígitos, o 12 con +52.",
      }),
    horario: z.string().trim().max(80),
    durante_viaje: z.string().trim().max(120),
  }),
} satisfies Partial<Record<ClaveAjuste, z.ZodType>>;

export type ClaveEditable = keyof typeof ESQUEMAS;

/** Junta lo guardado con los valores de fábrica, clave por clave. */
export function conDefectos(filas: { clave: string; valor: unknown }[]): Ajustes {
  const salida = structuredClone(AJUSTES_INICIALES) as Record<string, unknown>;
  for (const f of filas) {
    const base = salida[f.clave];
    if (base && typeof base === "object" && f.valor && typeof f.valor === "object" && !Array.isArray(f.valor))
      salida[f.clave] = { ...base, ...f.valor };
  }
  return salida as Ajustes;
}

/** «1.5%», «10%», «2.5%». */
export function textoPorcentaje(n: number): string {
  return `${Number(n.toFixed(2))}%`;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function textoRecordatorios(dias: number[]): string {
  return RECORDATORIOS.find((r) => r.valor.join() === dias.join())?.etiqueta ?? dias.join(", ");
}

/** Lo que queda en la bitácora: «Tolerancia de precio: $300 por servicio». */
export function textoBitacora<C extends ClaveEditable>(clave: C, v: z.infer<(typeof ESQUEMAS)[C]>): string {
  const x = v as unknown as Record<string, never>;
  switch (clave) {
    case "ganancia_defecto":
      return `Ganancia por defecto: hoteles ${textoPorcentaje(x.hoteles)}, actividades y traslados ${textoPorcentaje(x.actividades)}, vuelos ${textoPorcentaje(x.vuelos)}`;
    case "cargo_servicio":
      return `Cargo por servicio: ${formatoDinero(x.centavos)} por viaje`;
    case "tolerancia_precio":
      return `Tolerancia de precio: ${formatoDinero(x.centavos)} por servicio`;
    case "colchon_tipo_cambio":
      return `Colchón de tipo de cambio: ${textoPorcentaje(x.porcentaje)}`;
    case "plazo_datos_y_pago":
      return `Plazo de Datos y pago: ${plural(x.horas, "hora", "horas")}`;
    case "vigencia_cotizacion":
      return `Vigencia de la cotización: ${plural(x.dias, "día", "días")}`;
    case "pagos_flexibles":
      return `Pagos flexibles: liquidar ${plural(x.dias_antes, "día", "días")} antes del viaje`;
    case "recordatorios_cliente":
      return `Recordatorios de pago al cliente: ${textoRecordatorios(x.dias_antes)}`;
    case "aviso_pago_proveedor":
      return `Aviso de pago a proveedores: ${plural(x.dias_antes, "día", "días")} antes de la fecha límite`;
    case "agencia":
      return "Datos de la agencia actualizados";
  }
  return "Configuración actualizada";
}

/**
 * El ejemplo de la tolerancia con el viaje de Nataly: el seguro subió $49.50
 * y el vuelo $448.95. Cambia según el límite.
 */
export function ejemploTolerancia(limite: number): string {
  const caso = (que: string, subio: number) =>
    `${que} subió ${formatoDinero(subio)} y ${subio <= limite ? "se absorbió" : "se le mandó la versión 2"}`;
  return `Ejemplo con el viaje de Nataly: ${caso("el seguro", 4950)}; ${caso("el vuelo", 44895)}.`;
}

/** FIX + colchón, a dos decimales: 18.42 + 1.5% = 18.70. */
export function tipoCambioConColchon(fix: number, colchon: number): string {
  const diezmilesimas = Math.round(fix * 10000);
  const con = Math.round((diezmilesimas * (10000 + Math.round(colchon * 100))) / 10000);
  return (Math.round(con / 100) / 100).toFixed(2);
}

// ---- Cuenta para recibir pagos de los clientes ----

/** Una cuenta nueva se activa 24 h después de confirmarla. */
export const HORAS_PARA_ACTIVAR = 24;

export function activaDesde(ahora: Date): Date {
  return new Date(ahora.getTime() + HORAS_PARA_ACTIVAR * 3600_000);
}

type CuentaCobro = {
  id: string;
  estado: "verificada" | "por_activar" | "reemplazada";
  principal: boolean;
  activaDesde: Date | null;
};

/**
 * Qué cuenta usa Datos y pago ahora y cuál espera su turno. No hay cron: se
 * calcula al leer, comparando con la hora de activación guardada.
 */
export function cuentasCobroAhora<C extends CuentaCobro>(
  cuentas: C[],
  ahora: Date,
): { vigente: C | null; pendiente: C | null; porActivar: C[] } {
  const lista = (c: C) => c.estado === "por_activar" && !!c.activaDesde && c.activaDesde <= ahora;
  const porActivar = cuentas
    .filter(lista)
    .sort((a, b) => b.activaDesde!.getTime() - a.activaDesde!.getTime());
  const vigente = porActivar[0] ?? cuentas.find((c) => c.estado === "verificada" && c.principal) ?? null;
  const pendiente =
    cuentas.find((c) => c.estado === "por_activar" && (!c.activaDesde || c.activaDesde > ahora)) ?? null;
  return { vigente, pendiente, porActivar };
}
