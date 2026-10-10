"use client";

import { useEffect } from "react";

/** Mensaje breve abajo al centro, como los «toast» de los prototipos. */
export function AvisoFlotante({ texto, alCerrar }: { texto: string | null; alCerrar: () => void }) {
  useEffect(() => {
    if (!texto) return;
    const t = setTimeout(alCerrar, 4000);
    return () => clearTimeout(t);
  }, [texto, alCerrar]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      {texto ? (
        <div className="pointer-events-auto rounded-campo bg-tinta px-4 py-2.5 text-[13.5px] font-medium text-white shadow-menu">
          {texto}
        </div>
      ) : null}
    </div>
  );
}
