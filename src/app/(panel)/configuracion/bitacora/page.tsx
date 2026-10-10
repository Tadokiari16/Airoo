import type { Metadata } from "next";
import { formatoFechaHora } from "@/lib/fechas";
import { usuarioActual } from "@/lib/sesion";
import { EncabezadoTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { entradasBitacora } from "./datos";

export const metadata: Metadata = { title: "Bitácora" };

export default async function Bitacora() {
  const yo = await usuarioActual();
  const entradas = await entradasBitacora(200);
  return (
    <Tarjeta>
      <EncabezadoTarjeta titulo="Bitácora" sub="Quién cambió qué en la configuración. Se guarda un año.">
        <a
          href="/configuracion/bitacora/exportar"
          className="inline-flex h-[34px] items-center rounded-[10px] px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
        >
          Exportar
        </a>
      </EncabezadoTarjeta>
      {entradas.length === 0 ? (
        <div className="border-t border-linea">
          <Vacio titulo="Sin cambios todavía">
            Cada invitación, cambio de rol o ciudad nueva queda anotada aquí.
          </Vacio>
        </div>
      ) : (
        <ul className="border-t border-linea">
          {entradas.map((e) => (
            <li key={e.id} className="flex gap-4 border-b border-linea px-[18px] py-2.5 last:border-b-0">
              <span className="num w-44 shrink-0 text-[13px] text-tinta-3">{formatoFechaHora(e.cuando)}</span>
              <span className="flex-1">{e.texto}</span>
              <span className="text-[13px] text-tinta-3">
                {e.quien === yo.nombre ? "Tú" : (e.quien ?? "Sistema")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
