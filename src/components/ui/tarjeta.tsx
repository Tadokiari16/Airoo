import type { HTMLAttributes, ReactNode } from "react";

export function Tarjeta({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-tarjeta bg-tarjeta shadow-tarjeta ${className}`} {...props} />;
}

export function EncabezadoTarjeta({
  titulo,
  sub,
  children,
}: {
  titulo: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-[18px] pt-4 pb-2.5">
      <div>
        <h2 className="text-[17px] font-bold">{titulo}</h2>
        {sub ? <p className="text-[13px] font-medium text-tinta-3">{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Estado vacío: describe qué va a aparecer aquí y cuándo. */
export function Vacio({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="px-[18px] py-10 text-center">
      <p className="text-[15px] font-semibold text-tinta">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-tinta-2">{children}</p>
    </div>
  );
}
