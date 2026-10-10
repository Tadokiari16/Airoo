"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Aeropuerto } from "@/lib/vuelos";
import { buscarAeropuertos } from "./acciones";
import { CAJA } from "./piezas";

const texto = (a: Aeropuerto | undefined, iata: string) => (a ? `${a.iata} · ${a.ciudad}` : iata);

/**
 * Aeropuerto de la lista: busca por clave, ciudad o nombre («CUN», «Cancún»,
 * «Benito Juárez»). Solo se queda lo que se elige de la lista; lo escrito sin
 * elegir se descarta al salir del campo.
 */
export function CampoAeropuerto({
  etiqueta,
  valor,
  aeropuerto,
  alElegir,
}: {
  etiqueta: string;
  /** Clave IATA elegida, o "" si no hay. */
  valor: string;
  aeropuerto: Aeropuerto | undefined;
  alElegir: (a: Aeropuerto | null) => void;
}) {
  const lista = useId();
  const [escrito, setEscrito] = useState<string | null>(null);
  const [opciones, setOpciones] = useState<Aeropuerto[]>([]);
  const [activa, setActiva] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (escrito === null || escrito.trim().length < 2) return;
    const n = ++pedido.current;
    const reloj = setTimeout(async () => {
      const r = await buscarAeropuertos(escrito);
      if (n !== pedido.current) return;
      setOpciones(r);
      setActiva(0);
      setBuscando(false);
    }, 180);
    return () => clearTimeout(reloj);
  }, [escrito]);

  const abierto = escrito !== null && escrito.trim().length >= 2;
  const elegir = (a: Aeropuerto) => {
    alElegir(a);
    setEscrito(null);
    setOpciones([]);
  };

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-controls={lista}
        aria-autocomplete="list"
        aria-activedescendant={abierto && opciones[activa] ? `${lista}-${opciones[activa].iata}` : undefined}
        title={aeropuerto ? `${aeropuerto.nombre}, ${aeropuerto.ciudad}, ${aeropuerto.pais}` : undefined}
        value={escrito ?? texto(aeropuerto, valor)}
        placeholder="Clave o ciudad"
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setEscrito(e.target.value);
          setBuscando(e.target.value.trim().length >= 2);
          if (e.target.value.trim().length < 2) setOpciones([]);
        }}
        onKeyDown={(e) => {
          if (!abierto) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiva((i) => Math.min(opciones.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiva((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && opciones[activa]) {
            e.preventDefault();
            elegir(opciones[activa]);
          } else if (e.key === "Escape") setEscrito(null);
        }}
        onBlur={() => {
          // Sin texto se borra; con texto sin elegir se vuelve a lo que había.
          if (escrito !== null && !escrito.trim() && valor) alElegir(null);
          setEscrito(null);
          setOpciones([]);
        }}
        className={`${CAJA} truncate font-semibold`}
      />
      {abierto ? (
        <ul
          id={lista}
          role="listbox"
          aria-label={`Aeropuertos para ${etiqueta.toLowerCase()}`}
          className="absolute top-[calc(100%+4px)] left-0 z-20 max-h-72 w-[340px] overflow-auto rounded-[12px] bg-tarjeta p-1 shadow-tarjeta"
        >
          {opciones.length ? (
            opciones.map((a, i) => (
              <li
                key={a.iata}
                id={`${lista}-${a.iata}`}
                role="option"
                aria-selected={i === activa}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(a);
                }}
                onMouseEnter={() => setActiva(i)}
                className={`flex cursor-pointer items-baseline gap-2 rounded-[9px] px-2.5 py-1.5 text-[13px] ${i === activa ? "bg-azul-tenue" : ""}`}
              >
                <b className="num w-9 shrink-0 font-bold text-azul-oscuro">{a.iata}</b>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {a.ciudad}
                    <span className="font-normal text-tinta-3"> · {a.pais}</span>
                  </span>
                  <span className="block truncate text-[11.5px] text-tinta-3">{a.nombre}</span>
                </span>
              </li>
            ))
          ) : (
            <li className="px-2.5 py-2 text-[12.5px] text-tinta-3">
              {buscando
                ? "Buscando…"
                : `Sin aeropuertos con «${escrito?.trim()}». Se busca por clave (CUN), ciudad o nombre del aeropuerto.`}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
