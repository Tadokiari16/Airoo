"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ligaTripadvisor, nombreRegimen } from "@/lib/hoteles";
import { Boton } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/insignia";
import { IconoCandado, IconoEtiqueta, IconoExterno, IconoTelefono } from "@/components/iconos";
import { Dato, PanelLateral, Seccion } from "@/components/catalogo/panel-lateral";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import { FotosPanel } from "@/components/catalogo/fotos-panel";
import type { Hotel } from "./datos";
import { Calificacion, plural, type PermisosHotel } from "./piezas";
import { archivarHotel } from "./acciones";
import { textosArchivo } from "./textos";

const BOTON_LIGA =
  "inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave";

export function PanelHotel({
  hotel: h,
  posicion,
  alMover,
  alCerrar,
  alAvisar,
  alArchivar,
  permisos,
}: {
  hotel: Hotel | null;
  posicion?: { actual: number; total: number };
  alMover: (paso: 1 | -1) => void;
  alCerrar: () => void;
  alAvisar: (t: string) => void;
  alArchivar: (archivado: boolean) => void;
  permisos: PermisosHotel;
}) {
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [pendiente, iniciar] = useTransition();
  const telefono = h?.telefonoReservaciones ?? h?.telefonoPublico;
  const faltan = h?.revision.filter((r) => !r.ok) ?? [];
  const archivo = h ? textosArchivo(h) : null;

  const archivar = (motivo: string, a: boolean) =>
    iniciar(async () => {
      if (!h) return;
      const r = await archivarHotel(h.id, a, motivo);
      setConfirmar(null);
      alAvisar(
        r.error ??
          (a
            ? `${h.nombre} archivado · ya no aparece al cotizar`
            : `${h.nombre} vuelve a aparecer al cotizar`),
      );
      if (!r.error) alArchivar(a);
    });

  return (
    <PanelLateral
      abierto={!!h}
      alCerrar={alCerrar}
      posicion={posicion}
      alMover={alMover}
      titulo={h?.nombre ?? ""}
      insignia={h?.archivado ? <Insignia tono="ambar">Archivado</Insignia> : null}
      sub={h ? [h.ciudad, h.regimenes.map(nombreRegimen).join(" o ")].filter(Boolean).join(" · ") : null}
      cabecera={
        h ? (
          <>
            {h.tripadvisorCalificacion ? (
              <div className="mt-1">
                <Calificacion
                  decimas={h.tripadvisorCalificacion}
                  opiniones={h.tripadvisorOpiniones}
                  extra={
                    h.tripadvisorActualizado ? `Tripadvisor, al ${h.tripadvisorActualizado}` : "Tripadvisor"
                  }
                />
              </div>
            ) : null}
            <FotosPanel portada={h.portada} galeria={h.galeria} href={`/hoteles/${h.id}#fotos`} />
          </>
        ) : null
      }
      acciones={
        h && (telefono || h.tripadvisorId) ? (
          <>
            {telefono ? (
              <a href={`tel:${telefono.replace(/[^\d+]/g, "")}`} className={BOTON_LIGA}>
                <IconoTelefono tam={15} /> Llamar a reservaciones
              </a>
            ) : null}
            {h.tripadvisorId ? (
              <a
                href={ligaTripadvisor(h.tripadvisorId)}
                target="_blank"
                rel="noreferrer"
                className={BOTON_LIGA}
              >
                <IconoExterno tam={15} /> Tripadvisor
              </a>
            ) : null}
          </>
        ) : null
      }
      pie={
        h ? (
          <>
            {permisos.archivar ? (
              <Boton
                variante="secundario"
                className="h-10"
                disabled={pendiente}
                onClick={() => setConfirmar(h.archivado ? "reactivar" : "archivar")}
              >
                {h.archivado ? "Reactivar" : "Archivar"}
              </Boton>
            ) : null}
            <Link
              href={`/hoteles/${h.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-campo bg-azul px-4 text-sm font-semibold text-white hover:bg-azul-oscuro"
            >
              Abrir ficha
            </Link>
          </>
        ) : null
      }
    >
      {h ? (
        <>
          {h.archivado && h.motivoArchivo ? (
            <Seccion titulo="Archivado" tono="ambar">
              <p className="text-[13.5px] text-tinta-2">{h.motivoArchivo}</p>
            </Seccion>
          ) : null}
          {faltan.length && !h.archivado ? (
            <Seccion
              titulo="Para completar la ficha"
              tono="ambar"
              accion={
                permisos.editar ? (
                  <Link
                    href={`/hoteles/${h.id}`}
                    className="text-[13px] font-semibold text-azul-oscuro hover:underline"
                  >
                    Completar
                  </Link>
                ) : null
              }
            >
              <ul className="list-disc space-y-0.5 pl-5 text-[13.5px] text-tinta-2">
                {faltan.map((r) => (
                  <li key={r.clave}>{r.falta}</li>
                ))}
              </ul>
            </Seccion>
          ) : null}

          <Seccion titulo="Lo que ve el cliente" extra="En la propuesta">
            {h.descripcion ? <p className="mb-1.5 text-[13.5px] text-tinta">{h.descripcion}</p> : null}
            {h.llegada ? <Dato etiqueta="Llegada">Desde las {h.llegada}</Dato> : null}
            {h.salida ? <Dato etiqueta="Salida">Hasta las {h.salida}</Dato> : null}
            {h.cargos.map((c) => (
              <Dato key={c.id} etiqueta="Pagas en el hotel">
                {c.concepto}
                <span className="block text-[12.5px] font-medium text-tinta-3">{c.texto}</span>
              </Dato>
            ))}
            {!h.descripcion && !h.llegada && !h.salida && h.cargos.length === 0 ? (
              <p className="text-[13.5px] text-tinta-3">Todavía no hay descripción, horarios ni cargos.</p>
            ) : null}
          </Seccion>

          <Seccion titulo="Habitaciones">
            {h.habitaciones.length ? (
              <ul>
                {h.habitaciones.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 border-t border-linea py-2 first:border-t-0"
                  >
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px] font-semibold">{r.nombre}</b>
                      <span className="text-[12.5px] text-tinta-3">
                        {r.fotos.length ? plural(r.fotos.length, "foto", "fotos") : "Sin fotos"}
                      </span>
                    </div>
                    <span
                      className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold ${r.nombres.length ? "bg-suave text-tinta-2" : "bg-ambar-tenue text-ambar"}`}
                    >
                      <IconoEtiqueta tam={13} />
                      {r.nombres.length
                        ? plural(r.nombres.length, "nombre de proveedor", "nombres de proveedor")
                        : "sin nombre de proveedor"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-tinta-2">
                Todavía no hay habitaciones. Se agregan en la ficha o la primera vez que cotizas una tarifa de
                este hotel; ahí les pones el nombre que verá el cliente.
              </p>
            )}
          </Seccion>

          <Seccion titulo="Dónde se puede reservar">
            {h.dondeReservar.length ? (
              h.dondeReservar.map((d) => (
                <Dato key={d.id} etiqueta={d.tipo === "directo" ? "Trato directo" : d.proveedor}>
                  {d.tipo === "directo" ? (
                    <Link
                      href={`/proveedores?p=${d.proveedorId}`}
                      className="text-azul-oscuro hover:underline"
                    >
                      Ver en Proveedores
                    </Link>
                  ) : d.idExterno ? (
                    `ID ${d.idExterno}`
                  ) : (
                    <span className="font-medium text-tinta-3">Sin ID</span>
                  )}
                </Dato>
              ))
            ) : (
              <p className="text-[13.5px] text-tinta-3">Sin plataformas ni trato directo todavía.</p>
            )}
          </Seccion>

          <Seccion
            titulo="Para Airoo"
            accion={
              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-tinta-3">
                <IconoCandado tam={12} /> Solo el equipo
              </span>
            }
          >
            <Dato etiqueta="Reservaciones">
              {h.telefonoReservaciones ?? h.correoReservaciones ?? (
                <span className="font-medium text-tinta-3">Sin dato</span>
              )}
              <span className="block text-[12.5px] font-medium text-tinta-3">
                Para corroborar cada clave por teléfono
              </span>
            </Dato>
            <Dato etiqueta="Uso">
              {h.viajes ? plural(h.viajes, "viaje", "viajes") : `Sin viajes todavía · desde ${h.desde}`}
            </Dato>
            {h.notaInterna ? <Dato etiqueta="Nota">{h.notaInterna}</Dato> : null}
          </Seccion>
        </>
      ) : null}

      {h && archivo ? (
        <ConfirmarArchivo
          confirmacion={confirmar}
          nombre={h.nombre}
          objeto="hotel"
          alCerrar={() => setConfirmar(null)}
          alArchivar={(m) => archivar(m, true)}
          alReactivar={() => archivar("", false)}
          alEliminar={() => {}}
          archivar={archivo.archivar}
          reactivar={archivo.reactivar}
          eliminar={{ permitido: false, texto: "" }}
        />
      ) : null}
    </PanelLateral>
  );
}
