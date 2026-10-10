"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconoCerrar } from "@/components/iconos";

/** Diálogo modal nativo. Se cierra con Escape o con la X. */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      aria-label={titulo}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-tarjeta bg-tarjeta p-0 text-tinta shadow-menu backdrop:bg-tinta/30"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <h2 className="text-[17px] font-bold">{titulo}</h2>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="inline-flex size-7 items-center justify-center rounded-lg text-tinta-2 hover:bg-suave"
        >
          <IconoCerrar tam={16} />
        </button>
      </div>
      <div className="px-6 pt-3 pb-6">{abierto ? children : null}</div>
    </dialog>
  );
}
