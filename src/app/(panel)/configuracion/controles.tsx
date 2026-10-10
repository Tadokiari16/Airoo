"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { Tarjeta } from "@/components/ui/tarjeta";
import type { ClaveEditable } from "@/lib/configuracion";
import { guardarAjuste } from "./acciones";

type Resultado = { ok: true } | { error: string };

const Avisar = createContext<(t: string) => void>(() => {});

/** El aviso flotante de todas las secciones de Configuración. */
export function ConAvisos({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null);
  const cerrar = useCallback(() => setTexto(null), []);
  return (
    <Avisar.Provider value={setTexto}>
      {children}
      <AvisoFlotante texto={texto} alCerrar={cerrar} />
    </Avisar.Provider>
  );
}

export const useAvisar = () => useContext(Avisar);

export const GUARDADO = "Guardado · queda en la bitácora";

/** Guarda un ajuste y avisa; devuelve el error para mostrarlo junto al campo. */
export function useGuardarAjuste() {
  const avisar = useAvisar();
  return useCallback(
    async (clave: ClaveEditable, valor: unknown): Promise<Resultado> => {
      const r = await guardarAjuste(clave, valor);
      if ("ok" in r) avisar(GUARDADO);
      return r;
    },
    [avisar],
  );
}

export function Seccion({
  titulo,
  sub,
  accion,
  children,
}: {
  titulo: string;
  sub?: ReactNode;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Tarjeta className="px-5 py-[18px]" aria-label={titulo}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">{titulo}</h2>
        {accion}
      </header>
      {sub ? <p className="mt-1 mb-3 text-[13.5px] text-tinta-2">{sub}</p> : <span className="block h-2" />}
      {children}
    </Tarjeta>
  );
}

/** Subtítulo dentro de una tarjeta, como «Conexiones» en Pagos a proveedores. */
export function Subtitulo({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div className="mt-5">
      <h2 className="text-base font-bold">{titulo}</h2>
      {sub ? <p className="mt-1 mb-3 text-[13.5px] text-tinta-2">{sub}</p> : null}
    </div>
  );
}

export function Fila({
  titulo,
  sub,
  id,
  children,
}: {
  titulo: string;
  sub?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_260px] items-center gap-4 border-t border-linea py-3 first-of-type:border-t-0">
      <div>
        {id ? (
          <label htmlFor={id} className="block text-sm font-semibold">
            {titulo}
          </label>
        ) : (
          <b className="block text-sm font-semibold">{titulo}</b>
        )}
        {sub ? <span className="mt-0.5 block text-[12.5px] text-tinta-3">{sub}</span> : null}
      </div>
      <div className="flex justify-end">{children}</div>
    </div>
  );
}

const CAJA =
  "flex h-[34px] w-full items-center gap-1.5 rounded-[9px] bg-tarjeta px-2.5 text-[13.5px] shadow-borde";

/** Un valor que no se cambia desde aquí: «Fijo», «Sin conexión». */
export function Fijo({ children, apagado = false }: { children: ReactNode; apagado?: boolean }) {
  return <span className={`${CAJA} ${apagado ? "text-tinta-3" : "text-tinta"}`}>{children}</span>;
}

export function Ejemplo({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 rounded-xl bg-suave px-3.5 py-3 text-[13px] text-tinta-2 [&_b]:text-tinta">
      {children}
    </div>
  );
}

/** Botones de opción: guardan al elegir. */
export function Segmentos<T>({
  etiqueta,
  opciones,
  valor,
  igual = (a, b) => a === b,
  alElegir,
}: {
  etiqueta: string;
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  igual?: (a: T, b: T) => boolean;
  alElegir?: (v: T) => Promise<Resultado>;
}) {
  const [pendiente, iniciar] = useTransition();
  const [elegido, setElegido] = useState(valor);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <div role="group" aria-label={etiqueta} className="flex flex-wrap justify-end gap-1.5">
        {opciones.map((o) => {
          const on = igual(o.valor, elegido);
          return (
            <button
              key={o.etiqueta}
              type="button"
              aria-pressed={on}
              disabled={pendiente || !alElegir}
              onClick={() => {
                if (on || !alElegir) return;
                const antes = elegido;
                setElegido(o.valor);
                setError(null);
                iniciar(async () => {
                  const r = await alElegir(o.valor);
                  if ("error" in r) {
                    setElegido(antes);
                    setError(r.error);
                  }
                });
              }}
              className={`h-[30px] cursor-pointer rounded-lg px-2.5 text-[12.5px] font-semibold disabled:cursor-default ${
                on
                  ? "bg-azul-tenue text-azul-oscuro shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
                  : "bg-tarjeta text-tinta-2 shadow-borde hover:bg-suave"
              }`}
            >
              {o.etiqueta}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-[12.5px] text-rojo">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Lista desplegable: guarda al elegir. Para opciones con texto largo. */
export function ListaAjuste({
  id,
  opciones,
  valor,
  alElegir,
}: {
  id: string;
  opciones: { valor: string; etiqueta: string }[];
  valor: string;
  alElegir: (v: string) => Promise<Resultado>;
}) {
  const [elegido, setElegido] = useState(valor);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="flex w-full flex-col items-end gap-1">
      <select
        id={id}
        value={elegido}
        disabled={pendiente}
        onChange={(e) => {
          const antes = elegido;
          const v = e.target.value;
          setElegido(v);
          setError(null);
          iniciar(async () => {
            const r = await alElegir(v);
            if ("error" in r) {
              setElegido(antes);
              setError(r.error);
            }
          });
        }}
        className={`${CAJA} cursor-pointer outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]`}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-[12.5px] text-rojo">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Un campo que guarda al salir de él o con Enter. Esc deja el valor guardado.
 * `leer` convierte el texto al valor; devuelve null si no se entiende.
 */
export function CampoAjuste<T>({
  id,
  valor,
  texto,
  leer,
  prefijo,
  sufijo,
  alinear = "derecha",
  modo = "decimal",
  placeholder,
  alGuardar,
}: {
  id: string;
  valor: T;
  texto: (v: T) => string;
  leer: (t: string) => T | null;
  prefijo?: string;
  sufijo?: string;
  alinear?: "derecha" | "izquierda";
  modo?: "decimal" | "numeric" | "text" | "tel";
  placeholder?: string;
  alGuardar: (v: T) => Promise<Resultado>;
}) {
  const [actual, setActual] = useState(texto(valor));
  const [guardado, setGuardado] = useState(texto(valor));
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const guardar = () => {
    if (actual.trim() === guardado.trim()) return setError(null);
    const v = leer(actual);
    if (v === null) return setError("No se entiende ese valor.");
    iniciar(async () => {
      const r = await alGuardar(v);
      if ("error" in r) return setError(r.error);
      setError(null);
      setActual(texto(v));
      setGuardado(texto(v));
    });
  };

  return (
    <div className="flex w-full flex-col items-end gap-1">
      <div
        className={`${CAJA} focus-within:shadow-[inset_0_0_0_1.5px_var(--color-azul)] ${error ? "shadow-[inset_0_0_0_1.5px_var(--color-rojo)]" : ""}`}
      >
        {prefijo ? <span className="text-tinta-3">{prefijo}</span> : null}
        <input
          id={id}
          value={actual}
          inputMode={modo}
          placeholder={placeholder}
          autoComplete="off"
          disabled={pendiente}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setActual(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              guardar();
            }
            if (e.key === "Escape") {
              setActual(guardado);
              setError(null);
            }
          }}
          className={`num min-w-0 flex-1 bg-transparent outline-none placeholder:text-tinta-3/70 ${alinear === "derecha" ? "text-right" : ""}`}
        />
        {sufijo ? <span className="text-tinta-3">{sufijo}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12.5px] text-rojo">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Lectores para CampoAjuste.
export const leerNumero = (t: string): number | null => {
  const limpio = t.replace(/[%\s,]/g, "");
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  return Number(limpio);
};
export const leerEntero = (t: string): number | null => {
  const n = leerNumero(t.replace(/d[ií]as?|horas?/gi, ""));
  return n !== null && Number.isInteger(n) ? n : null;
};
