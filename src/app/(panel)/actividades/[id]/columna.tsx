"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Cambio } from "@/lib/bitacora";
import { Dialogo } from "@/components/ui/dialogo";
import { Interruptor } from "@/components/ui/interruptor";
import { IconoHistorial, IconoPalomita } from "@/components/iconos";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import type { Actividad } from "../datos";
import { archivarActividad, eliminarActividad } from "../acciones";
import { textosArchivo, type PermisosActividad } from "../textos";

/** Columna derecha: estado, qué va a pedir el armador y uso. */
export function ColumnaActividad({
  actividad: a,
  pide,
  historial,
  editada,
  permisos,
  alAvisar,
}: {
  actividad: Actividad;
  pide: string[];
  historial: Cambio[];
  editada: string;
  permisos: PermisosActividad;
  alAvisar: (t: string) => void;
}) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const archivo = textosArchivo(a);

  const archivar = (si: boolean, motivo = "") =>
    iniciar(async () => {
      const r = await archivarActividad(a.id, si, motivo);
      setConfirmar(null);
      alAvisar(
        r.error ??
          (si
            ? "Actividad archivada · ya no aparece al cotizar"
            : "Actividad activa · ya aparece al cotizar"),
      );
    });

  return (
    <aside className="sticky top-5 flex flex-col gap-4">
      <Caja titulo="Estado">
        <div className="flex items-center gap-2.5">
          {permisos.archivar ? (
            <Interruptor
              encendido={!a.archivado}
              etiqueta="Actividad activa"
              disabled={pendiente}
              alCambiar={() => setConfirmar(a.archivado ? "reactivar" : "archivar")}
              tam="grande"
            />
          ) : null}
          <b className="text-[14px] font-semibold">{a.archivado ? "Archivada" : "Activa"}</b>
        </div>
        <p className="mt-1.5 text-[12.5px] text-tinta-3">
          {a.archivado
            ? "No aparece al cotizar; los viajes que ya la usan no cambian."
            : "Aparece al buscar actividades en el armador."}
        </p>
        {permisos.eliminar ? (
          <div className="mt-3 border-t border-linea pt-3">
            <button
              type="button"
              onClick={() => setConfirmar("eliminar")}
              className="block cursor-pointer text-[13px] font-semibold text-tinta-2 hover:text-rojo hover:underline"
            >
              Eliminar actividad
            </button>
            <p className="mt-1.5 text-[12px] text-tinta-3">
              {a.viajes
                ? `Se usó en ${a.viajes} viajes, así que no se puede eliminar; se puede archivar.`
                : "Todavía no se usa en ningún viaje, así que se puede eliminar."}
            </p>
          </div>
        ) : null}
      </Caja>

      <Caja titulo="En el armador se va a pedir">
        <ul aria-label="En el armador se va a pedir" className="flex flex-col gap-1.5">
          {pide.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[13px] text-tinta-2">
              <IconoPalomita tam={14} className="shrink-0 text-verde" />
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12.5px] text-tinta-3">
          Más el precio de cada renglón, su moneda y el acuerdo de la reserva: pago y cancelación.
        </p>
      </Caja>

      <Caja titulo="Uso">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          <dt className="text-tinta-3">Viajes</dt>
          <dd className="text-right font-semibold">{a.viajes}</dd>
          <dt className="text-tinta-3">Desde</dt>
          <dd className="text-right font-semibold">{a.desde}</dd>
          <dt className="text-tinta-3">Editada</dt>
          <dd className="text-right font-semibold">{editada}</dd>
        </dl>
        <button
          type="button"
          onClick={() => setVerHistorial(true)}
          className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
        >
          <IconoHistorial tam={14} /> Ver historial de cambios
        </button>
      </Caja>

      <ConfirmarArchivo
        confirmacion={confirmar}
        nombre={a.nombre}
        objeto="actividad"
        alCerrar={() => setConfirmar(null)}
        alArchivar={(m) => archivar(true, m)}
        alReactivar={() => archivar(false)}
        alEliminar={() =>
          iniciar(async () => {
            const r = await eliminarActividad(a.id);
            setConfirmar(null);
            if (r.error) return alAvisar(r.error);
            router.push("/actividades");
          })
        }
        archivar={archivo.archivar}
        reactivar={archivo.reactivar}
        eliminar={
          a.viajes
            ? {
                permitido: false,
                texto: `Se usó en ${a.viajes} viajes, así que no se puede eliminar. Se puede archivar.`,
              }
            : {
                permitido: true,
                texto:
                  "Todavía no se usa en ningún viaje. Se borra con sus fotos, bloques y proveedores ligados, y no se puede deshacer.",
              }
        }
      />

      <Dialogo
        abierto={verHistorial}
        alCerrar={() => setVerHistorial(false)}
        titulo="Historial de cambios"
        sub={a.nombre}
        ancho={560}
      >
        {historial.length ? (
          <ol className="max-h-[60vh] overflow-auto">
            {historial.map((c) => (
              <li key={c.id} className="border-t border-linea py-2 text-[13.5px] first:border-t-0">
                {c.texto}
                <span className="block text-[12px] text-tinta-3">
                  {c.quien} · {c.cuando}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-tinta-2">Todavía no hay cambios en la bitácora.</p>
        )}
      </Dialogo>
    </aside>
  );
}

function Caja({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="rounded-tarjeta bg-tarjeta px-4 py-3.5 shadow-tarjeta">
      <h2 className="mb-2 text-[14px] font-bold">{titulo}</h2>
      {children}
    </section>
  );
}
