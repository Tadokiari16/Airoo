import type { ReactNode } from "react";

/** Título de cada sección con su descripción, como en los catálogos. */
export function Encabezado({
  titulo,
  children,
  acciones,
}: {
  titulo: string;
  children?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mt-[26px] mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] first-letter:text-azul">{titulo}</h1>
        {children ? <p className="mt-1 max-w-2xl text-[14.5px] text-tinta-2">{children}</p> : null}
      </div>
      {acciones}
    </div>
  );
}
