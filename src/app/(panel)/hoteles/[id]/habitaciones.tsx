"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoMas, IconoSubir } from "@/components/iconos";
import { AccionFoto, BotonSubir, CasillaSubir, FotosOrdenables } from "@/components/catalogo/fotos";
import type { Habitacion, Hotel } from "../datos";
import { agregarHabitacion, quitarHabitacion, renombrarHabitacion } from "../acciones";
import { ordenarFotos, quitarFoto, subirFotos } from "../../fotos-acciones";
import { Bloque } from "@/components/catalogo/bloque";

type Correr = (f: () => Promise<{ error?: string }>, ok?: string) => void;

export function Habitaciones({
  hotel: h,
  editable,
  alAvisar,
}: {
  hotel: Hotel;
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
  const habFotos = h.habitaciones.find((r) => r.id === fotosDe) ?? null;

  return (
    <Bloque
      id="habitaciones"
      titulo="Habitaciones"
      muestra="El cliente ve tu nombre y sus fotos"
      descripcion="Cada habitación lleva el nombre que ve el cliente y sus fotos. Camas y número de personas no se guardan aquí: se eligen en el armador, en cada cotización."
    >
      {h.habitaciones.length ? (
        <table className="w-full table-fixed text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase">
              <th className="w-[55%] pb-2 pl-1.5">Nombre para el cliente</th>
              <th className="pb-2">Fotos</th>
            </tr>
          </thead>
          <tbody>
            {h.habitaciones.map((r) => (
              <Fila
                key={r.id}
                hab={r}
                hotelId={h.id}
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
                    const r = await subirFotos({ tipo: "hotel", id: h.id }, { habitacionId: habFotos.id }, d);
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
  editable,
  correr,
  alAvisar,
  alVerFotos,
}: {
  hab: Habitacion;
  hotelId: string;
  editable: boolean;
  correr: Correr;
  alAvisar: (t: string) => void;
  alVerFotos: () => void;
}) {
  const [nombre, setNombre] = useState(r.nombre);
  const [quitar, setQuitar] = useState(false);

  const guardarNombre = () => {
    if (nombre.trim() === r.nombre) return;
    correr(() => renombrarHabitacion(r.id, nombre), "Nombre de la habitación guardado");
  };

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
              Se borran sus fotos.
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
                const res = await subirFotos({ tipo: "hotel", id: hotelId }, { habitacionId: r.id }, d);
                alAvisar(res.error ?? `Fotos agregadas a «${r.nombre}»`);
              }}
              className="inline-flex size-[26px] cursor-pointer items-center justify-center rounded-md text-tinta-2 shadow-borde hover:bg-suave"
            >
              <IconoSubir tam={13} />
            </BotonSubir>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
