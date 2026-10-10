"use client";

import { useState, type ReactNode } from "react";
import { aCentavos, formatoDinero, type Moneda } from "@/lib/dinero";
import { horaTexto, leerHora } from "@/lib/armador";

// Controles chicos del armador, con la medida de CotizacionBuilder-v3.

export const CAJA =
  "h-9 w-full rounded-[10px] bg-tarjeta px-2.5 text-[13.5px] text-tinta shadow-borde outline-none placeholder:text-tinta-3/70 focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)] disabled:bg-suave disabled:text-tinta-2";

/** Botones juntos donde se elige uno: «Al reservar · Anticipo · En el lugar». */
export function Segmentos<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  chico,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  alCambiar: (v: T) => void;
  etiqueta: string;
  chico?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex rounded-[10px] bg-suave p-[3px]">
      {opciones.map((o) => {
        const on = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => alCambiar(o.valor)}
            className={`flex-1 cursor-pointer rounded-lg px-2 font-semibold whitespace-nowrap transition-colors ${chico ? "h-7 text-[12px]" : "h-8 text-[12.5px]"} ${on ? "bg-tarjeta text-azul-oscuro shadow-[0_1px_2px_rgba(17,26,43,.12)]" : "text-tinta-2 hover:text-tinta"}`}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Monto en centavos. Se escribe libre y se lee al salir del campo. */
export function CampoDinero({
  valor,
  alCambiar,
  etiqueta,
  moneda = "MXN",
  ambar,
  className = "",
}: {
  valor: number | null;
  alCambiar: (c: number | null) => void;
  etiqueta: string;
  moneda?: Moneda;
  /** Fondo ámbar cuando falta, como en el prototipo. */
  ambar?: boolean;
  className?: string;
}) {
  const formato = (c: number | null) => (c === null ? "" : formatoDinero(c, moneda).replace(/^(US\$|€|\$)/, ""));
  // Mientras se escribe se respeta el texto; fuera del campo se muestra el monto con formato.
  const [texto, setTexto] = useState(formato(valor));
  const [enfocado, setEnfocado] = useState(false);
  const prefijo = moneda === "USD" ? "US$" : moneda === "EUR" ? "€" : "$";
  return (
    <label
      className={`flex h-9 items-center gap-1 rounded-[10px] px-2.5 text-[13.5px] shadow-borde focus-within:shadow-[inset_0_0_0_1.5px_var(--color-azul)] ${ambar && valor === null ? "bg-ambar-tenue" : "bg-tarjeta"} ${className}`}
    >
      <span className="text-tinta-3">{prefijo}</span>
      <input
        aria-label={etiqueta}
        inputMode="decimal"
        value={enfocado ? texto : formato(valor)}
        placeholder="0.00"
        onFocus={() => {
          setTexto(formato(valor));
          setEnfocado(true);
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          const c = e.target.value.trim() ? aCentavos(e.target.value) : null;
          if (c !== null || !e.target.value.trim()) alCambiar(c === null ? null : Math.max(0, c));
        }}
        onBlur={() => setEnfocado(false)}
        className="num w-full min-w-0 bg-transparent text-right font-semibold outline-none placeholder:font-normal placeholder:text-tinta-3/60"
      />
    </label>
  );
}

/** Hora escrita rápido: «745p» → 07:45 PM. */
export function CampoHora({
  valor,
  alCambiar,
  etiqueta,
}: {
  valor: string | null;
  alCambiar: (h: string | null) => void;
  etiqueta: string;
}) {
  const [texto, setTexto] = useState(horaTexto(valor));
  const [error, setError] = useState(false);
  const [anterior, setAnterior] = useState(valor);
  if (anterior !== valor) {
    setAnterior(valor);
    setTexto(horaTexto(valor));
  }
  return (
    <input
      aria-label={etiqueta}
      title="Escribe una hora, por ejemplo 745p"
      value={texto}
      placeholder="--:-- --"
      aria-invalid={error || undefined}
      onChange={(e) => {
        setTexto(e.target.value);
        setError(false);
      }}
      onBlur={() => {
        if (!texto.trim()) {
          alCambiar(null);
          return;
        }
        const h = leerHora(texto);
        if (h) {
          alCambiar(h);
          setTexto(horaTexto(h));
        } else setError(true);
      }}
      className={`${CAJA} num font-semibold aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_var(--color-rojo)]`}
    />
  );
}

/** − 2 + para personas y cantidades. */
export function Paso({
  valor,
  alCambiar,
  etiqueta,
  min = 0,
  max = 99,
  sufijo,
}: {
  valor: number;
  alCambiar: (n: number) => void;
  etiqueta: string;
  min?: number;
  max?: number;
  sufijo?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex h-9 items-center rounded-[10px] bg-tarjeta shadow-borde">
      <button
        type="button"
        aria-label={`Menos ${etiqueta.toLowerCase()}`}
        disabled={valor <= min}
        onClick={() => alCambiar(valor - 1)}
        className="h-full w-8 cursor-pointer text-[16px] text-tinta-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className="num min-w-6 text-center text-[13.5px] font-semibold">
        {valor}
        {sufijo ? <span className="font-normal text-tinta-3"> {sufijo}</span> : null}
      </span>
      <button
        type="button"
        aria-label={`Más ${etiqueta.toLowerCase()}`}
        disabled={valor >= max}
        onClick={() => alCambiar(valor + 1)}
        className="h-full w-8 cursor-pointer text-[16px] text-tinta-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function Etiqueta({ children, ayuda }: { children: ReactNode; ayuda?: ReactNode }) {
  return (
    <span className="mb-1 block text-[12.5px] font-semibold text-tinta-2">
      {children}
      {ayuda ? <span className="font-normal text-tinta-3"> · {ayuda}</span> : null}
    </span>
  );
}

export function SoloTu({ children = "Solo tú lo ves" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-tinta-3">
      <OjoTachado /> {children}
    </span>
  );
}

export const OjoTachado = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 5 9 7a10 10 0 0 1-2.2 3.2M6.1 6.1C4 7.5 3 9.6 3 12c0 2 4 7 9 7a9.7 9.7 0 0 0 4.2-.9" />
  </svg>
);
