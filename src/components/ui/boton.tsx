import type { ButtonHTMLAttributes } from "react";

type Variante = "principal" | "secundario" | "peligro" | "texto";

const ESTILOS: Record<Variante, string> = {
  principal: "h-10 px-4 rounded-campo bg-azul text-white hover:bg-azul-oscuro disabled:bg-tinta-3/40",
  secundario: "h-[34px] px-3 rounded-[10px] bg-tarjeta text-tinta shadow-borde text-[13px] hover:bg-suave",
  peligro: "h-10 px-4 rounded-campo bg-rojo text-white hover:bg-rojo/90",
  texto: "h-8 px-1 text-azul-oscuro hover:underline",
};

export function Boton({
  variante = "principal",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors duration-150 ease-airoo cursor-pointer disabled:cursor-not-allowed ${ESTILOS[variante]} ${className}`}
      {...props}
    />
  );
}
