"use client";

import { useState, useTransition } from "react";
import { textoCapacidad } from "@/lib/traslados";
import { Boton } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/insignia";
import { IconoBasura, IconoSubir } from "@/components/iconos";
import { Dato, PanelLateral, Seccion } from "@/components/catalogo/panel-lateral";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import { BotonSubir } from "@/components/catalogo/fotos";
import type { Unidad } from "./datos";
import {
  archivarUnidad,
  eliminarUnidad,
  guardarUnidad,
  quitarFotoUnidad,
  subirFotoUnidad,
  type DatosUnidad,
} from "./acciones";
import { ARCHIVO, plural, type PermisosTraslado } from "./textos";
import { CamposUnidad } from "./nueva";

const BOTON_FOTO =
  "inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave";

/** Los tipos de unidad se consultan y se editan aquí mismo; no tienen ficha aparte. */
export function PanelUnidad({
  unidad: u,
  posicion,
  alMover,
  alCerrar,
  alAvisar,
  alArchivar,
  alEliminar,
  permisos,
}: {
  unidad: Unidad | null;
  posicion?: { actual: number; total: number };
  alMover: (paso: 1 | -1) => void;
  alCerrar: () => void;
  alAvisar: (t: string) => void;
  alArchivar: (archivada: boolean) => void;
  alEliminar: () => void;
  permisos: PermisosTraslado;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const enEdicion = !!u && editando === u.id;

  const archivar = (motivo: string, si: boolean) =>
    iniciar(async () => {
      if (!u) return;
      const r = await archivarUnidad(u.id, si, motivo);
      setConfirmar(null);
      alAvisar(
        r.error ?? (si ? `${u.nombre} archivada · ya no aparece al cotizar` : `${u.nombre} vuelve a aparecer al cotizar`),
      );
      if (!r.error) alArchivar(si);
    });

  return (
    <PanelLateral
      abierto={!!u}
      alCerrar={alCerrar}
      posicion={posicion}
      alMover={(p) => {
        setEditando(null);
        alMover(p);
      }}
      titulo={u?.nombre ?? ""}
      insignia={
        u?.archivado ? (
          <Insignia tono="ambar">Archivada</Insignia>
        ) : u?.adaptada ? (
          <Insignia tono="azul">Adaptada</Insignia>
        ) : null
      }
      sub={u ? (u.viajes ? plural(u.viajes, "viaje", "viajes") : "Sin viajes todavía") : null}
      pie={
        u ? (
          enEdicion ? (
            <>
              <Boton
                variante="secundario"
                className="h-10"
                onClick={() => {
                  setEditando(null);
                  setError(null);
                }}
              >
                Cancelar
              </Boton>
              <Boton key="guardar" type="submit" form="editar-unidad" className="h-10 flex-1" disabled={pendiente}>
                Guardar
              </Boton>
            </>
          ) : (
            <>
              {permisos.archivar ? (
                <Boton
                  variante="secundario"
                  className="h-10"
                  disabled={pendiente}
                  onClick={() => setConfirmar(u.archivado ? "reactivar" : "archivar")}
                >
                  {u.archivado ? "Reactivar" : "Archivar"}
                </Boton>
              ) : null}
              {permisos.editar ? (
                <Boton key="editar" className="h-10 flex-1" onClick={() => setEditando(u.id)}>
                  Editar
                </Boton>
              ) : null}
            </>
          )
        ) : null
      }
    >
      {u && enEdicion ? (
        <Edicion
          key={u.id}
          unidad={u}
          error={error}
          alGuardar={(datos) =>
            iniciar(async () => {
              const r = await guardarUnidad(u.id, datos);
              if (r.error) return setError(r.error);
              setError(null);
              setEditando(null);
              alAvisar(`${datos.nombre} guardada · las cotizaciones nuevas ya usan estos datos`);
            })
          }
          eliminar={permisos.eliminar ? () => setConfirmar("eliminar") : null}
        />
      ) : u ? (
        <>
          {u.archivado && u.motivoArchivo ? (
            <Seccion titulo="Archivada" tono="ambar">
              <p className="text-[13.5px] text-tinta-2">{u.motivoArchivo}</p>
            </Seccion>
          ) : null}

          <Seccion
            titulo="Foto"
            extra={<span className="text-azul-oscuro">En la propuesta</span>}
          >
            {u.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto webp del bucket
              <img src={u.foto.url} alt={u.nombre} className="aspect-[16/9] w-full rounded-xl object-cover" />
            ) : (
              <p className="text-[13.5px] text-ambar">
                Sin foto todavía. La propuesta muestra la unidad con su nombre y su capacidad.
              </p>
            )}
            {permisos.editar ? (
              <div className="mt-2 flex gap-2">
                <BotonSubir
                  varias={false}
                  etiqueta={u.foto ? `Cambiar foto de ${u.nombre}` : `Subir foto de ${u.nombre}`}
                  className={BOTON_FOTO}
                  alSubir={async (datos) => {
                    const r = await subirFotoUnidad(u.id, datos);
                    alAvisar(r.error ?? `Foto de ${u.nombre} guardada`);
                  }}
                >
                  <IconoSubir tam={14} /> {u.foto ? "Cambiar foto" : "Subir foto"}
                </BotonSubir>
                {u.foto ? (
                  <button
                    type="button"
                    disabled={pendiente}
                    className={`${BOTON_FOTO} text-tinta-2 hover:text-rojo`}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await quitarFotoUnidad(u.id);
                        alAvisar(r.error ?? "Foto quitada");
                      })
                    }
                  >
                    <IconoBasura tam={14} /> Quitar
                  </button>
                ) : null}
              </div>
            ) : null}
          </Seccion>

          <Seccion titulo="Capacidad" extra={<span className="text-azul-oscuro">El armador avisa si se excede</span>}>
            <Dato etiqueta="Pasajeros">Hasta {u.pasajeros}</Dato>
            <Dato etiqueta="Maletas">Hasta {u.maletas}</Dato>
            <Dato etiqueta="Adaptada">{u.adaptada ? "Sí, para silla de ruedas" : "No"}</Dato>
          </Seccion>

          <Seccion titulo="Descripción" extra={<span className="text-azul-oscuro">En la propuesta</span>}>
            {u.descripcion ? (
              <p className="text-[13.5px] text-tinta">{u.descripcion}</p>
            ) : (
              <p className="text-[13.5px] text-ambar">Sin descripción todavía. Se agrega con «Editar».</p>
            )}
          </Seccion>

          <Seccion titulo="Qué no va aquí">
            <p className="text-[13.5px] text-tinta-2">
              Ciudad, proveedor y precio no se guardan en el catálogo. En cada cotización se eligen la ruta, la
              fecha, dónde se reserva y el costo; el operador se captura al reservar.
            </p>
          </Seccion>
        </>
      ) : null}

      {u ? (
        <ConfirmarArchivo
          confirmacion={confirmar}
          nombre={u.nombre}
          objeto="unidad"
          alCerrar={() => setConfirmar(null)}
          alArchivar={(m) => archivar(m, true)}
          alReactivar={() => archivar("", false)}
          alEliminar={() =>
            iniciar(async () => {
              const r = await eliminarUnidad(u.id);
              setConfirmar(null);
              if (r.error) return alAvisar(r.error);
              setEditando(null);
              alAvisar(`${u.nombre} eliminada del catálogo`);
              alEliminar();
            })
          }
          archivar={ARCHIVO.archivar}
          reactivar={ARCHIVO.reactivar}
          eliminar={
            u.viajes
              ? {
                  permitido: false,
                  texto: `Se usó en ${plural(u.viajes, "viaje", "viajes")}, así que no se puede eliminar. Se puede archivar.`,
                }
              : {
                  permitido: true,
                  texto: "Todavía no se usa en ningún viaje. Se borra con su foto y no se puede deshacer.",
                }
          }
        />
      ) : null}
    </PanelLateral>
  );
}

function Edicion({
  unidad: u,
  error,
  alGuardar,
  eliminar,
}: {
  unidad: Unidad;
  error: string | null;
  alGuardar: (d: DatosUnidad) => void;
  eliminar: (() => void) | null;
}) {
  const [datos, setDatos] = useState<DatosUnidad>({
    nombre: u.nombre,
    pasajeros: u.pasajeros,
    maletas: u.maletas,
    adaptada: u.adaptada,
    descripcion: u.descripcion ?? "",
  });
  return (
    <form
      id="editar-unidad"
      aria-label={`Editar ${u.nombre}`}
      onSubmit={(e) => {
        e.preventDefault();
        alGuardar(datos);
      }}
      className="flex flex-col gap-3"
    >
      {error ? (
        <p role="alert" className="rounded-xl bg-rojo-tenue px-3.5 py-2.5 text-[13.5px] text-rojo">
          {error}
        </p>
      ) : null}
      <Seccion titulo="Unidad">
        <CamposUnidad datos={datos} alCambiar={setDatos} descripcion />
        <p className="mt-2 text-[12.5px] text-tinta-3">{textoCapacidad(datos)}</p>
      </Seccion>
      {eliminar ? (
        <button
          type="button"
          onClick={eliminar}
          className="self-start cursor-pointer text-[13px] font-semibold text-tinta-2 hover:text-rojo hover:underline"
        >
          Eliminar tipo de unidad
        </button>
      ) : null}
    </form>
  );
}
