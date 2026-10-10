"use client";

// Piezas de las listas de catálogo (Proveedores, Hoteles, Actividades,
// Servicios, Aerolíneas): pestañas con contador, búsqueda y tabla con filas
// que abren el panel lateral.

import type { ReactNode, ThHTMLAttributes } from "react";
import { IconoBuscar, IconoChevron } from "@/components/iconos";

export type Pestana<T extends string> = { valor: T; etiqueta: string; n: number; oculta?: boolean };

export function Pestanas<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
}: {
  opciones: Pestana<T>[];
  valor: T;
  alCambiar: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="tablist" aria-label={etiqueta} className="flex gap-7 border-b border-linea px-5 pt-4">
      {opciones
        .filter((o) => !o.oculta || o.valor === valor)
        .map((o) => {
          const activa = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => alCambiar(o.valor)}
              className={`inline-flex cursor-pointer items-center gap-[7px] px-0.5 pb-[13px] text-[14.5px] font-semibold transition-[color,box-shadow] duration-150 ease-airoo hover:text-tinta ${activa ? "text-tinta shadow-[inset_0_-2px_0_var(--color-azul)]" : "text-tinta-3"}`}
            >
              {o.etiqueta}
              <span
                className={`num inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-[7px] text-xs font-bold ${activa ? "bg-azul-tenue text-azul-oscuro" : "bg-[#eef1f5] text-tinta-2"}`}
              >
                {o.n}
              </span>
            </button>
          );
        })}
    </div>
  );
}

export function BuscadorLista({
  valor,
  alCambiar,
  placeholder,
  children,
}: {
  valor: string;
  alCambiar: (v: string) => void;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-5 py-3.5">
      <label className="flex h-9 w-[340px] items-center gap-2 rounded-[10px] bg-tarjeta px-3 text-tinta-3 shadow-borde focus-within:shadow-[inset_0_0_0_1.5px_var(--color-azul)]">
        <IconoBuscar tam={16} />
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13.5px] text-tinta outline-none placeholder:text-tinta-3"
        />
      </label>
      {children}
    </div>
  );
}

export function Tabla({
  columnas,
  children,
}: {
  columnas: { titulo: string; ancho: string }[];
  children: ReactNode;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-[13.5px]">
      <thead>
        <tr>
          {columnas.map((c, i) => (
            <Th key={c.titulo || i} style={{ width: c.ancho }} className={i === 0 ? "pl-[18px]" : ""}>
              {c.titulo}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Th({ className = "", ...p }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`border-y border-linea bg-[#fafbfd] px-3.5 py-2.5 text-left text-[11.5px] font-bold tracking-[0.05em] whitespace-nowrap text-tinta-3 uppercase ${className}`}
      {...p}
    />
  );
}

/** Fila que abre el panel lateral. Con teclado: Enter o espacio. */
export function FilaCatalogo({
  seleccionada,
  alAbrir,
  etiqueta,
  children,
}: {
  seleccionada: boolean;
  alAbrir: () => void;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <tr
      tabIndex={0}
      aria-label={etiqueta}
      aria-selected={seleccionada}
      onClick={alAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          alAbrir();
        }
      }}
      className={`cursor-pointer border-b border-linea transition-colors duration-100 ease-airoo last:border-b-0 ${seleccionada ? "bg-azul-tenue" : "hover:bg-[#f8fafd]"}`}
    >
      {children}
    </tr>
  );
}

/** Celda con un dato en negritas y su detalle abajo, como en los prototipos. */
export function Celda({
  titulo,
  sub,
  tonoSub,
  primera,
}: {
  titulo: ReactNode;
  sub?: ReactNode;
  tonoSub?: "ambar" | "verde";
  primera?: boolean;
}) {
  const tono =
    tonoSub === "ambar"
      ? "font-semibold text-ambar"
      : tonoSub === "verde"
        ? "font-semibold text-verde"
        : "text-tinta-3";
  return (
    <td className={`px-3.5 py-[13px] align-middle ${primera ? "pl-[18px]" : ""}`}>
      <div className="flex min-w-0 flex-col">
        <b className="truncate text-sm font-semibold">{titulo}</b>
        {sub ? <span className={`truncate text-[12.5px] ${tono}`}>{sub}</span> : null}
      </div>
    </td>
  );
}

export function SinResultados({ children }: { children: ReactNode }) {
  return <p className="border-t border-linea px-5 py-10 text-center text-tinta-2">{children}</p>;
}

/** Botones de opción del prototipo: uno o varios encendidos. */
export function Opciones<T extends string>({
  opciones,
  elegidas,
  alCambiar,
  etiqueta,
  varias = false,
}: {
  opciones: { valor: T; etiqueta: string }[];
  elegidas: T[];
  alCambiar: (v: T[]) => void;
  etiqueta: string;
  varias?: boolean;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-1.5">
      {opciones.map((o) => {
        const on = elegidas.includes(o.valor);
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={on}
            onClick={() =>
              alCambiar(
                varias ? (on ? elegidas.filter((e) => e !== o.valor) : [...elegidas, o.valor]) : [o.valor],
              )
            }
            className={`h-[30px] cursor-pointer rounded-lg px-2.5 text-[12.5px] font-semibold ${on ? "bg-azul-tenue text-azul-oscuro shadow-[inset_0_0_0_1.5px_var(--color-azul)]" : "bg-tarjeta text-tinta-2 shadow-borde"}`}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Filtro de la lista: «Destino Todos ▾», con un select invisible encima. */
export function Filtro({
  etiqueta,
  valor,
  alCambiar,
  opciones,
  femenino = false,
  sinFiltro,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  opciones: [string, string][];
  femenino?: boolean;
  /** Cómo se llama la opción sin filtro, si no es «Todos». */
  sinFiltro?: string;
}) {
  const todos = sinFiltro ?? (femenino ? "Todas" : "Todos");
  const actual = opciones.find(([id]) => id === valor)?.[1] ?? todos;
  return (
    <label className="relative inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13.5px] text-tinta-2 shadow-borde focus-within:shadow-[inset_0_0_0_1.5px_var(--color-azul)]">
      {etiqueta} <b className="max-w-40 truncate font-semibold text-tinta">{actual}</b>
      <IconoChevron tam={15} />
      <select
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">{todos}</option>
        {opciones.map(([id, nombre]) => (
          <option key={id} value={id}>
            {nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
