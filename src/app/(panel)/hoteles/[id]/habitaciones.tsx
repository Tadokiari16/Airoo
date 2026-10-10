"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoCerrar, IconoMas, IconoSubir } from "@/components/iconos";
import { AccionFoto, BotonSubir, CasillaSubir, FotosOrdenables } from "@/components/catalogo/fotos";
import type { Habitacion, Hotel, OpcionProveedor } from "../datos";
import {
  agregarHabitacion,
  agregarNombreProveedor,
  ordenarFotos,
  quitarFoto,
  quitarHabitacion,
  quitarNombreProveedor,
  renombrarHabitacion,
  subirFotos,
} from "../acciones";
import { Bloque } from "./bloque";

type Correr = (f: () => Promise<{ error?: string }>, ok?: string) => void;

export function Habitaciones({
  hotel: h,
  proveedores,
  editable,
  alAvisar,
}: {
  hotel: Hotel;
  proveedores: OpcionProveedor[];
  editable: boolean;
  alAvisar: (t: string) => void;
}) {
  const [, iniciar] = useTransition();
  const [nueva, setNueva] = useState<string | null>(null);
  const [fotosDe, setFotosDe] = useState<string | null>(null);
  const correr: Correr = (f, ok) =>
    iniciar(async () => {
      const r = await f();
      if (r.error) alAvisar(r.error);
      else if (ok) alAvisar(ok);
    });
  // Primero las plataformas donde se reserva este hotel; después las demás.
  const donde = new Set(h.dondeReservar.map((d) => d.proveedorId));
  const opciones = [...proveedores].sort((a, b) => Number(donde.has(b.id)) - Number(donde.has(a.id)));
  const habFotos = h.habitaciones.find((r) => r.id === fotosDe) ?? null;

  return (
    <Bloque
      id="habitaciones"
      titulo="Habitaciones"
      muestra="El cliente ve tu nombre y sus fotos"
      descripcion="Cada plataforma llama distinto a la misma habitación. Guardar sus nombres sirve para encontrarla rápido al reservar y para revisar que el bono coincida; el cliente siempre ve el tuyo. Camas y número de personas no se guardan aquí: se eligen en el armador, en cada cotización."
    >
      {h.habitaciones.length ? (
        <table className="w-full table-fixed text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase">
              <th className="w-[30%] pb-2 pl-1.5">Nombre para el cliente</th>
              <th className="w-[22%] pb-2">Fotos</th>
              <th className="pb-2">Nombres de proveedor</th>
            </tr>
          </thead>
          <tbody>
            {h.habitaciones.map((r) => (
              <Fila
                key={r.id}
                hab={r}
                hotelId={h.id}
                opciones={opciones}
                editable={editable}
                correr={correr}
                alAvisar={alAvisar}
                alVerFotos={() => setFotosDe(r.id)}
              />
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded-xl bg-suave px-3.5 py-3 text-[13.5px] text-tinta-2">
          Todavía no hay habitaciones. Se agregan aquí o la primera vez que cotizas una tarifa de este hotel;
          el nombre es el que verá el cliente.
        </p>
      )}

      {editable ? (
        nueva === null ? (
          <button
            type="button"
            onClick={() => setNueva("")}
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
          >
            <IconoMas tam={15} /> Agregar habitación
          </button>
        ) : (
          <div className="mt-3 flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Nombre para el cliente</span>
              <input
                autoFocus
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    correr(async () => {
                      const r = await agregarHabitacion(h.id, nueva);
                      if (!r.error) setNueva(null);
                      return r;
                    });
                  }
                  if (e.key === "Escape") setNueva(null);
                }}
                placeholder="Ej. Suite Deluxe vista al mar"
                className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              />
            </label>
            <Boton variante="secundario" className="h-10" onClick={() => setNueva(null)}>
              Cancelar
            </Boton>
            <Boton
              onClick={() =>
                correr(async () => {
                  const r = await agregarHabitacion(h.id, nueva);
                  if (!r.error) setNueva(null);
                  return r;
                })
              }
            >
              Agregar
            </Boton>
          </div>
        )
      ) : null}

      <Dialogo
        abierto={!!habFotos}
        alCerrar={() => setFotosDe(null)}
        titulo={habFotos ? `Fotos de «${habFotos.nombre}»` : ""}
        sub="Se suben aquí y solo aparecen en esta habitación. Se ordenan arrastrando."
        ancho={640}
      >
        {habFotos ? (
          <FotosOrdenables
            etiqueta={`Fotos de ${habFotos.nombre}`}
            fotos={habFotos.fotos}
            columnas={4}
            editable={editable}
            alOrdenar={(ids) => correr(() => ordenarFotos(ids))}
            acciones={(f) => (
              <AccionFoto
                aria-label="Quitar foto"
                onClick={() => correr(() => quitarFoto(f.id), "Foto quitada")}
              >
                Quitar
              </AccionFoto>
            )}
            final={
              editable ? (
                <CasillaSubir
                  etiqueta={`Subir fotos de ${habFotos.nombre}`}
                  alSubir={async (d) => {
                    const r = await subirFotos(h.id, { habitacionId: habFotos.id }, d);
                    alAvisar(r.error ?? "Fotos agregadas a la habitación");
                  }}
                />
              ) : null
            }
          />
        ) : null}
      </Dialogo>
    </Bloque>
  );
}

function Fila({
  hab: r,
  hotelId,
  opciones,
  editable,
  correr,
  alAvisar,
  alVerFotos,
}: {
  hab: Habitacion;
  hotelId: string;
  opciones: OpcionProveedor[];
  editable: boolean;
  correr: Correr;
  alAvisar: (t: string) => void;
  alVerFotos: () => void;
}) {
  const [nombre, setNombre] = useState(r.nombre);
  const [agregando, setAgregando] = useState(false);
  const [proveedorId, setProveedorId] = useState(opciones[0]?.id ?? "");
  const [nombreProv, setNombreProv] = useState("");
  const [quitar, setQuitar] = useState(false);

  const guardarNombre = () => {
    if (nombre.trim() === r.nombre) return;
    correr(() => renombrarHabitacion(r.id, nombre), "Nombre de la habitación guardado");
  };
  const agregar = () =>
    correr(async () => {
      const res = await agregarNombreProveedor(r.id, proveedorId, nombreProv);
      if (!res.error) {
        setNombreProv("");
        setAgregando(false);
      }
      return res;
    });

  return (
    <tr aria-label={r.nombre} className="border-t border-linea align-top">
      <td className="py-2.5 pr-3 pl-1.5">
        {editable ? (
          <input
            aria-label="Nombre para el cliente"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="-mx-1.5 w-full rounded-lg px-1.5 py-1 font-semibold outline-none hover:bg-suave focus:bg-tarjeta focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
          />
        ) : (
          <b className="font-semibold">{r.nombre}</b>
        )}
        {editable ? (
          quitar ? (
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-tinta-2">
              Se borran sus fotos y nombres.
              <button
                type="button"
                className="cursor-pointer font-semibold text-rojo hover:underline"
                onClick={() => correr(() => quitarHabitacion(r.id), `«${r.nombre}» quitada`)}
              >
                Quitar
              </button>
              <button
                type="button"
                className="cursor-pointer font-semibold hover:underline"
                onClick={() => setQuitar(false)}
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="mt-0.5 cursor-pointer text-[12px] font-semibold text-tinta-3 hover:text-rojo hover:underline"
              onClick={() => setQuitar(true)}
            >
              Quitar habitación
            </button>
          )
        ) : null}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1.5">
          {r.fotos.length ? (
            <button
              type="button"
              onClick={alVerFotos}
              aria-label={`Ver fotos de ${r.nombre}`}
              className="flex cursor-pointer items-center gap-1"
            >
              {r.fotos.slice(0, 3).map((f) => (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura del bucket
                <img key={f.id} src={f.miniatura} alt="" className="size-[26px] rounded-md object-cover" />
              ))}
              {r.fotos.length > 3 ? (
                <span className="text-[12px] text-tinta-3">+{r.fotos.length - 3}</span>
              ) : null}
            </button>
          ) : (
            <button
              type="button"
              onClick={alVerFotos}
              className="cursor-pointer text-[12.5px] font-semibold text-ambar hover:underline"
            >
              Sin fotos
            </button>
          )}
          {editable ? (
            <BotonSubir
              etiqueta={`Subir fotos de ${r.nombre}`}
              alSubir={async (d) => {
                const res = await subirFotos(hotelId, { habitacionId: r.id }, d);
                alAvisar(res.error ?? `Fotos agregadas a «${r.nombre}»`);
              }}
              className="inline-flex size-[26px] cursor-pointer items-center justify-center rounded-md text-tinta-2 shadow-borde hover:bg-suave"
            >
              <IconoSubir tam={13} />
            </BotonSubir>
          ) : null}
        </div>
      </td>
      <td className="py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {r.nombres.map((n) => (
            <span
              key={n.id}
              className="inline-flex h-[26px] max-w-full items-center gap-1.5 rounded-md bg-suave px-2 text-[12px]"
            >
              <b className="text-[10.5px] font-bold text-tinta-3">{n.proveedor}</b>
              <span className="truncate">{n.nombre}</span>
              {editable ? (
                <button
                  type="button"
                  aria-label={`Quitar ${n.nombre}`}
                  className="cursor-pointer text-tinta-3 hover:text-rojo"
                  onClick={() => correr(() => quitarNombreProveedor(n.id))}
                >
                  <IconoCerrar tam={12} />
                </button>
              ) : null}
            </span>
          ))}
          {editable && !agregando ? (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="h-[26px] cursor-pointer px-1 text-[12px] font-semibold text-azul-oscuro hover:underline"
            >
              + Nombre
            </button>
          ) : null}
        </div>
        {agregando ? (
          <div
            className="mt-2 flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={`Nombre de proveedor para ${r.nombre}`}
          >
            <select
              aria-label="Proveedor"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="h-8 rounded-lg bg-tarjeta px-2 text-[12.5px] shadow-borde"
            >
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
            <input
              autoFocus
              aria-label="Nombre en la tarifa del proveedor"
              value={nombreProv}
              onChange={(e) => setNombreProv(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregar();
                }
                if (e.key === "Escape") setAgregando(false);
              }}
              placeholder="Tal como aparece en la tarifa"
              className="h-8 min-w-0 flex-1 rounded-lg bg-tarjeta px-2 text-[12.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
            />
            <button
              type="button"
              onClick={agregar}
              className="h-8 cursor-pointer rounded-lg bg-azul px-2.5 text-[12.5px] font-semibold text-white"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setAgregando(false)}
              className="h-8 cursor-pointer px-1.5 text-[12.5px] font-semibold text-tinta-2"
            >
              Cancelar
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
