// Piezas que comparten la lista, el panel y la ficha de hoteles.

import { bolitas, nombreRegimen, textoCalificacion } from "@/lib/hoteles";

export type PermisosHotel = { editar: boolean; archivar: boolean; eliminar: boolean };

/** Calificación de Tripadvisor con sus cinco bolitas verdes. */
export function Calificacion({
  decimas,
  opiniones,
  extra,
}: {
  decimas: number;
  opiniones: number | null;
  extra?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-tinta-2">
      <span className="inline-flex gap-[3px]" aria-hidden="true">
        {bolitas(decimas).map((b, i) => (
          <span
            key={i}
            className={`size-[11px] rounded-full border-[1.5px] border-[#00aa6c] ${b === "llena" ? "bg-[#00aa6c]" : b === "media" ? "bg-[linear-gradient(90deg,#00aa6c_50%,transparent_50%)]" : ""}`}
          />
        ))}
      </span>
      <b className="font-bold text-tinta">{textoCalificacion(decimas)}</b>
      {opiniones ? <span className="num">{opiniones.toLocaleString("en-US")} opiniones</span> : null}
      {extra ? <span>· {extra}</span> : null}
    </span>
  );
}

/** «AI», «BB» en azul, con el nombre completo al pasar el cursor. */
export function Regimenes({ claves }: { claves: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {claves.map((c) => (
        <abbr
          key={c}
          title={nombreRegimen(c)}
          className="inline-flex h-6 min-w-8 items-center justify-center rounded-md bg-azul-tenue px-1.5 text-[11.5px] font-bold text-azul-oscuro no-underline"
        >
          {c}
        </abbr>
      ))}
    </span>
  );
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
