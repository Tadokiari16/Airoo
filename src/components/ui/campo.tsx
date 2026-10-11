import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const CAJA =
  "w-full h-10 rounded-campo bg-tarjeta px-3 text-sm text-tinta shadow-borde outline-none placeholder:text-tinta-3/70 focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)] aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_var(--color-rojo)]";

type Comun = { etiqueta: string; ayuda?: ReactNode; error?: string };

export function Campo({
  etiqueta,
  ayuda,
  error,
  id,
  ...props
}: Comun & InputHTMLAttributes<HTMLInputElement>) {
  const campoId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={campoId} className="text-[13px] font-semibold text-tinta">
        {etiqueta}
      </label>
      <input id={campoId} className={CAJA} aria-invalid={error ? true : undefined} {...props} />
      {error ? (
        <p className="text-[12.5px] text-rojo">{error}</p>
      ) : ayuda ? (
        <p className="text-[12.5px] text-tinta-3">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  id,
  children,
  ...props
}: Comun & SelectHTMLAttributes<HTMLSelectElement>) {
  const campoId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={campoId} className="text-[13px] font-semibold text-tinta">
        {etiqueta}
      </label>
      <select id={campoId} className={CAJA} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
      {error ? (
        <p className="text-[12.5px] text-rojo">{error}</p>
      ) : ayuda ? (
        <p className="text-[12.5px] text-tinta-3">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function AreaTexto({
  etiqueta,
  ayuda,
  error,
  id,
  ...props
}: Comun & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const campoId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={campoId} className="text-[13px] font-semibold text-tinta">
        {etiqueta}
      </label>
      <textarea
        id={campoId}
        rows={3}
        className={CAJA.replace("h-10", "min-h-20 py-2.5 leading-snug")}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <p className="text-[12.5px] text-rojo">{error}</p>
      ) : ayuda ? (
        <p className="text-[12.5px] text-tinta-3">{ayuda}</p>
      ) : null}
    </div>
  );
}
