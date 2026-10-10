"use client";

// Vista rápida a la derecha de cada catálogo: «1 de 9», flechas ↑ ↓ para
// pasar al siguiente, Escape para cerrar.

import { useEffect, type ReactNode } from "react";
import { IconoAbajo, IconoArriba, IconoCerrar } from "@/components/iconos";

export function PanelLateral({
  abierto,
  alCerrar,
  posicion,
  alMover,
  titulo,
  insignia,
  sub,
  cabecera,
  acciones,
  pie,
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  posicion?: { actual: number; total: number };
  alMover: (paso: 1 | -1) => void;
  titulo: string;
  insignia?: ReactNode;
  sub?: ReactNode;
  /** Algo más bajo el título, como las fotos del hotel. */
  cabecera?: ReactNode;
  acciones?: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      // Con un diálogo abierto o escribiendo en un campo, las teclas son de ellos.
      if (document.querySelector("dialog[open]")) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") alCerrar();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        alMover(e.key === "ArrowDown" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto, alCerrar, alMover]);

  return (
    <aside
      aria-label={abierto ? titulo : undefined}
      aria-hidden={!abierto}
      inert={!abierto}
      className={`fixed top-0 right-0 z-30 flex h-dvh w-[460px] max-w-full flex-col bg-tarjeta shadow-[-1px_0_0_var(--color-linea),-24px_0_48px_-24px_rgba(17,26,43,.28)] transition-[transform,visibility] duration-250 ease-airoo ${abierto ? "visible translate-x-0" : "invisible translate-x-[104%]"}`}
    >
      <div className="px-5 py-3.5">
        <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-tinta-3">
          <BotonIcono etiqueta="Anterior" alPulsar={() => alMover(-1)}>
            <IconoArriba tam={15} />
          </BotonIcono>
          <BotonIcono etiqueta="Siguiente" alPulsar={() => alMover(1)}>
            <IconoAbajo tam={15} />
          </BotonIcono>
          {posicion ? (
            <span className="num ml-1">
              {posicion.actual} de {posicion.total}
            </span>
          ) : null}
          <kbd className="ml-1 rounded-[5px] bg-fondo px-[5px] py-px text-[11px] font-bold">↑ ↓</kbd>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="ml-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-[9px] bg-fondo text-tinta-2 hover:bg-linea"
          >
            <IconoCerrar tam={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-[19px] font-bold tracking-[-0.01em]">{titulo}</h2>
          {insignia}
        </div>
        {sub ? <p className="mt-[3px] text-[13.5px] text-tinta-2">{sub}</p> : null}
        {cabecera}
      </div>
      {acciones ? (
        <div className="flex flex-wrap gap-2 border-y border-linea bg-[#fafbfd] px-5 py-2.5">{acciones}</div>
      ) : null}
      <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-5 py-4">{children}</div>
      {pie ? <div className="flex gap-2 border-t border-linea px-5 py-3.5">{pie}</div> : null}
    </aside>
  );
}

function BotonIcono({
  etiqueta,
  alPulsar,
  children,
}: {
  etiqueta: string;
  alPulsar: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={etiqueta}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg bg-tarjeta text-tinta-2 shadow-borde hover:bg-suave"
    >
      {children}
    </button>
  );
}

/** Sección del panel con su título en versalitas y una acción a la derecha. */
export function Seccion({
  titulo,
  extra,
  accion,
  children,
  tono,
}: {
  titulo: string;
  extra?: ReactNode;
  accion?: ReactNode;
  children: ReactNode;
  tono?: "ambar";
}) {
  return (
    <section
      aria-label={titulo}
      className={`rounded-[14px] px-3.5 py-3 shadow-borde ${tono === "ambar" ? "bg-ambar-tenue" : ""}`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <h3 className="text-xs font-bold tracking-[0.05em] text-tinta-3 uppercase">{titulo}</h3>
        {extra ? <span className="text-[11.5px] font-semibold text-tinta-3">{extra}</span> : null}
        {accion ? <span className="ml-auto">{accion}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** Renglón dato–valor: «Sitio · ratehawk.com». */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[118px_1fr] gap-2.5 border-t border-linea py-1.5 text-[13.5px] first-of-type:border-t-0">
      <span className="text-tinta-3">{etiqueta}</span>
      <b className="min-w-0 font-semibold break-words">{children}</b>
    </div>
  );
}

/** Enlace de acción dentro de una sección («Editar», «Agregar»). */
export function AccionTexto({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-0.5 text-[13px] font-semibold text-azul-oscuro hover:bg-azul-tenue disabled:cursor-not-allowed disabled:opacity-50"
      {...p}
    >
      {children}
    </button>
  );
}

/** Aviso con candado: lo que el sistema no hace, dicho de forma descriptiva. */
export function NotaCandado({ children, icono }: { children: ReactNode; icono: ReactNode }) {
  return (
    <div className="mt-2 flex gap-2 rounded-xl border-l-[3px] border-linea bg-suave px-3 py-2.5 text-[13px] text-tinta-2">
      <span className="mt-0.5 shrink-0 text-tinta-3">{icono}</span>
      <p>{children}</p>
    </div>
  );
}
