"use client";

import { useEffect, useRef, useState } from "react";
import { IconoBuscar } from "@/components/iconos";

// La búsqueda de viajes, clientes, folios y claves llega en la Fase 2, cuando
// existan viajes. Por ahora el campo está y responde que no hay resultados.
export function Buscador() {
  const [texto, setTexto] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  return (
    <div className="relative max-w-[520px] flex-1">
      <label className="flex h-10 items-center gap-2.5 rounded-campo bg-tarjeta px-3 text-tinta-3 shadow-borde focus-within:shadow-[inset_0_0_0_1.5px_var(--color-azul)]">
        <IconoBuscar tam={17} />
        <span className="sr-only">Buscar</span>
        <input
          ref={ref}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setTexto("")}
          placeholder="Buscar viaje, cliente, folio o clave de confirmación"
          className="h-full flex-1 bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-3"
        />
        <kbd className="rounded-md bg-fondo px-1.5 py-0.5 text-[11.5px] font-bold text-tinta-3">⌘K</kbd>
      </label>
      {texto.trim() ? (
        <div
          role="status"
          className="absolute inset-x-0 top-12 z-20 rounded-[14px] bg-tarjeta p-4 text-[13.5px] text-tinta-2 shadow-menu"
        >
          Sin resultados para «{texto.trim()}». Todavía no hay viajes ni clientes registrados.
        </div>
      ) : null}
    </div>
  );
}
