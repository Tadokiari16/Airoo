import type { ReactNode } from "react";

type Tono = "azul" | "verde" | "ambar" | "rojo" | "gris" | "morado";

const TONOS: Record<Tono, string> = {
  azul: "bg-azul-tenue text-azul-oscuro",
  verde: "bg-verde-tenue text-verde",
  ambar: "bg-ambar-tenue text-ambar",
  rojo: "bg-rojo-tenue text-rojo",
  gris: "bg-gris text-tinta",
  morado: "bg-morado-tenue text-morado",
};

export function Insignia({ tono = "gris", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] text-xs font-semibold ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}

export function Avatar({
  iniciales,
  tono = "azul",
}: {
  iniciales: string;
  tono?: "azul" | "morado" | "verde";
}) {
  const t = {
    azul: "bg-azul-tenue text-azul-oscuro",
    morado: "bg-morado-tenue text-morado",
    verde: "bg-verde-tenue text-verde",
  }[tono];
  return (
    <span
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${t}`}
    >
      {iniciales}
    </span>
  );
}
