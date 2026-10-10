import { NOMBRE_TIPO_CUENTA, enmascarar } from "@/lib/cuentas";
import { formatoMesAnio } from "@/lib/fechas";
import type { Cuenta, Proveedor } from "./datos";

export type Permisos = {
  editar: boolean;
  archivar: boolean;
  eliminar: boolean;
  cuentas: boolean;
  verCompleta: boolean;
};

export const CATEGORIAS = ["Hoteles", "Tours y parques", "Traslados", "Seguros", "Otro"] as const;

export const PARA_QUE = [
  { valor: "reservas", etiqueta: "Reservas" },
  { valor: "ventas", etiqueta: "Ventas" },
  { valor: "pagos", etiqueta: "Pagos" },
  { valor: "emergencias", etiqueta: "Emergencias" },
] as const;

export const nombreParaQue = (v: string) => PARA_QUE.find((p) => p.valor === v)?.etiqueta ?? v;

export const enCatalogo = (p: Proveedor) => p.usos.hoteles + p.usos.actividades + p.usos.servicios;

/** «Hoteles y traslados · 12 en catálogo» */
export function subtitulo(p: Proveedor): string {
  const cats = p.categorias.map((c, i) => (i === 0 ? c : c.toLowerCase()));
  const que = cats.length > 1 ? cats.slice(0, -1).join(", ") + " y " + cats.at(-1) : (cats[0] ?? "");
  const n = enCatalogo(p);
  return [que, n ? `${n} en catálogo` : null].filter(Boolean).join(" · ");
}

export const desde = (p: Proveedor) => "desde " + formatoMesAnio(new Date(p.desde + "T12:00:00"));

export const cuentaCorta = (c: Pick<Cuenta, "tipo" | "banco" | "ultimos4">) =>
  `${NOMBRE_TIPO_CUENTA[c.tipo]} ${c.banco} ${enmascarar(c.ultimos4)}`;

/** Lo que va en «Lo que le compras»: lo ligado en catálogos o, si aún no hay, sus categorías. */
export function loQueLeCompras(p: Proveedor): string[] {
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  const ligados = [
    p.usos.hoteles ? plural(p.usos.hoteles, "hotel", "hoteles") : null,
    p.usos.actividades ? plural(p.usos.actividades, "actividad", "actividades") : null,
    p.usos.servicios ? plural(p.usos.servicios, "servicio", "servicios") : null,
  ].filter(Boolean) as string[];
  return ligados.length ? ligados : p.categorias;
}
