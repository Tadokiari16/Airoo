"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconoBuscar } from "@/components/iconos";
import { buscarViajes, type ResultadoBusqueda } from "./buscar-acciones";

// Busca viajes por cliente, folio o destino. Las claves de confirmación se
// suman cuando existan reservas (Fase 3).
export function Buscador() {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return;
    const t = setTimeout(async () => setResultados(await buscarViajes(q)), 180);
    return () => clearTimeout(t);
  }, [texto]);

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
      {texto.trim().length >= 2 && resultados ? (
        <div className="absolute inset-x-0 top-12 z-20 overflow-hidden rounded-[14px] bg-tarjeta text-[13.5px] shadow-menu">
          {resultados.length ? (
            <ul aria-label="Viajes encontrados">
              {resultados.map((r) => (
                <li key={r.folio}>
                  <Link
                    href={`/viajes/${r.folio}`}
                    onClick={() => setTexto("")}
                    className="flex flex-col border-t border-linea px-4 py-2.5 first:border-t-0 hover:bg-suave"
                  >
                    <b className="font-semibold">{r.titulo}</b>
                    <span className="num text-[12.5px] text-tinta-3">{r.sub}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="p-4 text-tinta-2">
              Sin resultados para «{texto.trim()}». Se busca por cliente, folio o destino.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
