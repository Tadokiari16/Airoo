/** Interruptor verde de los prototipos (role=switch). */
export function Interruptor({
  encendido,
  alCambiar,
  etiqueta,
  disabled,
  tam = "normal",
}: {
  encendido: boolean;
  alCambiar: () => void;
  etiqueta: string;
  disabled?: boolean;
  tam?: "normal" | "grande";
}) {
  const grande = tam === "grande";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={alCambiar}
      className="inline-flex shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`relative rounded-full transition-colors ${grande ? "h-6 w-10" : "h-[22px] w-[38px]"} ${encendido ? "bg-verde" : "bg-gris"}`}
      >
        <span
          className={`absolute top-[3px] rounded-full bg-white shadow transition-[left] ${grande ? "size-[18px]" : "size-4"} ${encendido ? "left-[19px]" : "left-[3px]"}`}
        />
      </span>
    </button>
  );
}
