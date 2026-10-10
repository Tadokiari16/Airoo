import type { ReactNode } from "react";
import type { Etapa, Situacion } from "@/lib/etapas";
import type { ACargo } from "./datos";

/** Punto de la etapa: azul si espera a Airoo, verde si ya está todo, gris si no. */
export function tonoEtapa(etapa: Etapa, s: Situacion): "azul" | "verde" | "gris" {
  if (s.turno === "Airoo") return "azul";
  if (etapa === "reservada" || etapa === "en_viaje") return "verde";
  return "gris";
}

export function Punto({ tono }: { tono: "azul" | "verde" | "gris" }) {
  const c = { azul: "bg-azul", verde: "bg-verde", gris: "bg-tinta-3/50" }[tono];
  return <span aria-hidden className={`inline-block size-[7px] shrink-0 rounded-full ${c}`} />;
}

export function AvatarACargo({ a }: { a: ACargo }) {
  if (!a) return <span className="text-[12.5px] text-tinta-3">Sin asignar</span>;
  const tono = a.esYo ? "bg-azul-tenue text-azul-oscuro" : "bg-morado-tenue text-morado";
  return (
    <span
      title={a.nombre}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tono}`}
    >
      {a.iniciales}
    </span>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-md bg-fondo px-1.5 text-[11.5px] font-semibold text-tinta-2">
      {children}
    </span>
  );
}
