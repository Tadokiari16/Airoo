"use client";

import { useState } from "react";
import { Campo } from "@/components/ui/campo";

/** Cómo se cuenta cada pasajero. Las edades de los menores se guardan en el viaje. */
export const TEXTO_EDADES = "Adultos: 12 años o más · Menores: 2 a 11 · Bebés: menos de 2";

/**
 * Adultos, menores y la edad de cada menor. Escribe tres campos del formulario:
 * `adultos`, `menores` y `edades` (separadas por coma).
 */
export function Pasajeros({
  adultos = 2,
  menores: menoresInicial = 0,
  edades: edadesInicial = [],
}: {
  adultos?: number;
  menores?: number;
  edades?: number[];
}) {
  const [menores, setMenores] = useState(menoresInicial);
  const [edades, setEdades] = useState<string[]>(edadesInicial.map(String));
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="edades" value={edades.slice(0, menores).filter(Boolean).join(",")} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Adultos" name="adultos" type="number" min={1} max={40} defaultValue={adultos} required />
        <Campo
          etiqueta="Menores"
          name="menores"
          type="number"
          min={0}
          max={20}
          value={menores}
          onChange={(e) => setMenores(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
        />
      </div>
      <p className="-mt-1 text-[12.5px] text-tinta-3">{TEXTO_EDADES}</p>

      {menores > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Edad de cada menor</span>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: menores }, (_, i) => (
              <input
                key={i}
                aria-label={`Edad del menor ${i + 1}`}
                inputMode="numeric"
                value={edades[i] ?? ""}
                onChange={(e) => {
                  const n = [...edades];
                  n[i] = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setEdades(n);
                }}
                placeholder="Años"
                className="h-10 w-20 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              />
            ))}
          </div>
          <p className="text-[12.5px] text-tinta-3">Si todavía no se saben, se puede cotizar; antes de enviar se piden.</p>
        </div>
      ) : null}
    </div>
  );
}
