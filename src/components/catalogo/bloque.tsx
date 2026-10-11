import type { ReactNode } from "react";
import { IconoCandado, IconoOjo } from "@/components/iconos";

/** Sección de la ficha: título, a quién se le muestra y qué es. */
export function Bloque({
  id,
  titulo,
  muestra,
  soloEquipo,
  descripcion,
  extra,
  children,
}: {
  id?: string;
  titulo: string;
  /** «En la propuesta», «En el viaje confirmado». */
  muestra?: string;
  soloEquipo?: boolean;
  descripcion?: ReactNode;
  /** Algo a la derecha del título, como «8 de 8 encendidos». */
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={titulo}
      className="scroll-mt-6 rounded-tarjeta bg-tarjeta px-5 pt-[18px] pb-5 shadow-tarjeta"
    >
      <div className="flex items-center gap-3">
        <h2 className="text-[17px] font-bold">{titulo}</h2>
        {muestra ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-azul-oscuro">
            <IconoOjo tam={14} /> {muestra}
          </span>
        ) : null}
        {extra ? <span className="ml-auto text-[12px] font-semibold text-tinta-3">{extra}</span> : null}
        {soloEquipo ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-tinta-3">
            <IconoCandado tam={13} /> Solo el equipo
          </span>
        ) : null}
      </div>
      {descripcion ? <p className="mt-1 text-[13px] text-tinta-2">{descripcion}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Etiqueta pequeña de un grupo de campos («Cargos que se pagan en el hotel»). */
export function Subtitulo({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[13px] font-semibold text-tinta">{children}</p>;
}
