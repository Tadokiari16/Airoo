"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoAviso, IconoHistorial, IconoPalomita } from "@/components/iconos";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import type { Cambio, Hotel } from "../datos";
import type { PermisosHotel } from "../piezas";
import { archivarHotel, eliminarHotel, unirHoteles } from "../acciones";
import { textosArchivo } from "../textos";

const ANCLA: Record<string, string> = {
  portada: "#fotos",
  galeria: "#fotos",
  fotos_hab: "#habitaciones",
  cargos: "#llegada",
  reservaciones: "#equipo",
};

/** Columna derecha: estado, qué le falta a la ficha y uso. */
export function ColumnaFicha({
  hotel: h,
  historial,
  editada,
  otros,
  permisos,
  unido,
  alAvisar,
}: {
  hotel: Hotel;
  historial: Cambio[];
  editada: string;
  otros: { id: string; nombre: string; ciudad: string }[];
  permisos: PermisosHotel;
  unido: boolean;
  alAvisar: (t: string) => void;
}) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [unir, setUnir] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const ok = h.revision.filter((r) => r.ok).length;
  const total = h.revision.length;
  const archivo = textosArchivo(h);

  const archivar = (a: boolean, motivo = "") =>
    iniciar(async () => {
      const r = await archivarHotel(h.id, a, motivo);
      setConfirmar(null);
      alAvisar(
        r.error ??
          (a ? "Hotel archivado · ya no aparece al cotizar" : "Hotel activo · ya aparece al cotizar"),
      );
    });

  return (
    <aside className="sticky top-5 flex flex-col gap-4">
      <Caja titulo="Estado">
        {permisos.archivar && !unido ? (
          <button
            type="button"
            role="switch"
            aria-checked={!h.archivado}
            aria-label="Hotel activo"
            disabled={pendiente}
            onClick={() => setConfirmar(h.archivado ? "reactivar" : "archivar")}
            className="flex cursor-pointer items-center gap-2.5"
          >
            <span
              className={`relative h-[22px] w-[38px] rounded-full transition-colors ${h.archivado ? "bg-gris" : "bg-verde"}`}
            >
              <span
                className={`absolute top-[3px] size-4 rounded-full bg-white shadow transition-[left] ${h.archivado ? "left-[3px]" : "left-[19px]"}`}
              />
            </span>
            <b className="text-[14px] font-semibold">{h.archivado ? "Archivado" : "Activo"}</b>
          </button>
        ) : (
          <b className="text-[14px] font-semibold">
            {unido ? "Unido con otro hotel" : h.archivado ? "Archivado" : "Activo"}
          </b>
        )}
        <p className="mt-1.5 text-[12.5px] text-tinta-3">
          {h.archivado
            ? "No aparece al cotizar; los viajes que ya lo usan no cambian."
            : "Aparece al buscar hoteles en el armador."}
        </p>
        {permisos.eliminar && !unido ? (
          <div className="mt-3 border-t border-linea pt-3">
            <button
              type="button"
              onClick={() => setUnir(true)}
              className="block cursor-pointer text-[13px] font-semibold text-azul-oscuro hover:underline"
            >
              Unir con otro hotel
            </button>
            <button
              type="button"
              onClick={() => setConfirmar("eliminar")}
              className="mt-1 block cursor-pointer text-[13px] font-semibold text-tinta-2 hover:text-rojo hover:underline"
            >
              Eliminar hotel
            </button>
            <p className="mt-1.5 text-[12px] text-tinta-3">
              {h.viajes
                ? `Se usó en ${h.viajes} viajes, así que no se puede eliminar; se puede archivar. «Unir» sirve para duplicados: los viajes del otro pasan a este.`
                : "Todavía no se usa en ningún viaje, así que se puede eliminar. «Unir» sirve para duplicados: las fotos y habitaciones del otro pasan a este."}
            </p>
          </div>
        ) : null}
      </Caja>

      <Caja titulo={ok === total ? "Ficha completa" : `Ficha · ${ok} de ${total}`}>
        <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-gris" aria-hidden="true">
          <div
            className="h-full rounded-full bg-verde"
            style={{ width: `${Math.round((ok / total) * 100)}%` }}
          />
        </div>
        <ul aria-label="Qué tiene la ficha" className="flex flex-col gap-1.5">
          {h.revision.map((r) => (
            <li key={r.clave} className="flex items-center gap-2 text-[12.5px]">
              {r.ok ? (
                <IconoPalomita tam={14} className="shrink-0 text-verde" />
              ) : (
                <IconoAviso tam={14} className="shrink-0 text-ambar" />
              )}
              <a
                href={ANCLA[r.clave] ?? "#"}
                className={`flex-1 hover:underline ${r.ok ? "text-tinta-2" : "font-semibold text-tinta"}`}
              >
                {r.nombre}
              </a>
              <span className={`num ${r.ok ? "text-tinta-3" : "text-ambar"}`}>{r.valor}</span>
            </li>
          ))}
        </ul>
      </Caja>

      <Caja titulo="Uso">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          <dt className="text-tinta-3">Viajes</dt>
          <dd className="text-right font-semibold">{h.viajes}</dd>
          <dt className="text-tinta-3">Desde</dt>
          <dd className="text-right font-semibold">{h.desde}</dd>
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
        nombre={h.nombre}
        objeto="hotel"
        alCerrar={() => setConfirmar(null)}
        alArchivar={(m) => archivar(true, m)}
        alReactivar={() => archivar(false)}
        alEliminar={() =>
          iniciar(async () => {
            const r = await eliminarHotel(h.id);
            setConfirmar(null);
            if (r.error) return alAvisar(r.error);
            router.push("/hoteles");
          })
        }
        archivar={archivo.archivar}
        reactivar={archivo.reactivar}
        eliminar={
          h.viajes
            ? {
                permitido: false,
                texto: `Se usó en ${h.viajes} viajes, así que no se puede eliminar. Se puede archivar.`,
              }
            : {
                permitido: true,
                texto:
                  "Todavía no se usa en ningún viaje. Se borra con sus fotos y habitaciones, y no se puede deshacer.",
              }
        }
      />

      <UnirHotel
        abierto={unir}
        este={h.nombre}
        otros={otros}
        alCerrar={() => setUnir(false)}
        alUnir={(otroId) =>
          iniciar(async () => {
            const r = await unirHoteles(h.id, otroId);
            alAvisar(r.error ?? r.mensaje ?? "");
            if (!r.error) setUnir(false);
          })
        }
        pendiente={pendiente}
      />

      <Dialogo
        abierto={verHistorial}
        alCerrar={() => setVerHistorial(false)}
        titulo="Historial de cambios"
        sub={h.nombre}
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

function UnirHotel({
  abierto,
  este,
  otros,
  alCerrar,
  alUnir,
  pendiente,
}: {
  abierto: boolean;
  este: string;
  otros: { id: string; nombre: string; ciudad: string }[];
  alCerrar: () => void;
  alUnir: (id: string) => void;
  pendiente: boolean;
}) {
  const [otro, setOtro] = useState("");
  const elegido = otros.find((o) => o.id === otro);
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Unir con otro hotel"
      sub={`Para duplicados: se elige el otro hotel y todo lo suyo pasa a ${este}.`}
      ancho={520}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Hotel duplicado</span>
        <select
          value={otro}
          onChange={(e) => setOtro(e.target.value)}
          className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde"
        >
          <option value="">Elegir hotel</option>
          {otros.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre} · {o.ciudad}
            </option>
          ))}
        </select>
      </label>
      {elegido ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13.5px] text-tinta-2">
          <li>Sus fotos y habitaciones pasan a {este}.</li>
          <li>Sus plataformas también, salvo las que {este} ya tiene.</li>
          <li>
            Lo que {este} no tiene (descripción, horarios, Tripadvisor) se toma de {elegido.nombre}.
          </li>
          <li>{elegido.nombre} queda archivado como unido y deja de aparecer en la lista.</li>
        </ul>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton disabled={!otro || pendiente} onClick={() => alUnir(otro)}>
          Unir con este hotel
        </Boton>
      </div>
    </Dialogo>
  );
}
