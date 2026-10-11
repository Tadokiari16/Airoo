/**
 * Barra fija abajo de una ficha con cambios sin guardar. El botón «Guardar»
 * envía el formulario que la contiene, o el que dice `form`.
 */
export function BarraCambios({
  visible,
  error,
  pendiente,
  alDescartar,
  form,
}: {
  visible: boolean;
  error: string | null;
  pendiente: boolean;
  alDescartar: () => void;
  form?: string;
}) {
  if (!visible && !error) return null;
  return (
    <div
      role="region"
      aria-label="Cambios sin guardar"
      className="fixed bottom-5 left-1/2 z-40 flex w-[min(760px,calc(100vw-32px))] -translate-x-1/2 items-center gap-4 rounded-[16px] bg-tinta px-5 py-3 text-white shadow-menu"
    >
      <div className="min-w-0 flex-1">
        <b className="block text-[14px] font-semibold">Cambios sin guardar</b>
        <span
          className={`text-[12.5px] ${error ? "text-[#ffb4a8]" : "text-white/70"}`}
          role={error ? "alert" : undefined}
        >
          {error ?? "Las cotizaciones ya enviadas no cambian; las nuevas usan la ficha guardada."}
        </span>
      </div>
      <button
        type="button"
        onClick={alDescartar}
        className="h-9 cursor-pointer rounded-[10px] px-3 text-[13.5px] font-semibold text-white/85 hover:bg-white/10"
      >
        Descartar
      </button>
      <button
        type="submit"
        form={form}
        disabled={pendiente}
        className="h-9 cursor-pointer rounded-[10px] bg-azul px-4 text-[13.5px] font-semibold text-white hover:bg-azul-oscuro disabled:opacity-60"
      >
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
