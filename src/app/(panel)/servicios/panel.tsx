"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { modelo, nombreTipo, textoPasajeros, VARIANTES } from "@/lib/servicios";
import { ligaWhatsApp } from "@/lib/whatsapp";
import { Boton } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/insignia";
import { IconoCandado, IconoWhatsapp } from "@/components/iconos";
import { Dato, PanelLateral, Seccion } from "@/components/catalogo/panel-lateral";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import type { Servicio } from "./datos";
import { archivarServicio } from "./acciones";
import { comoLlega, plural, textosArchivo, type PermisosServicio } from "./textos";

const BOTON_LIGA =
  "inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave";

const SOLO_EQUIPO = (
  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-tinta-3">
    <IconoCandado tam={12} /> Solo el equipo
  </span>
);

const LO_VE = <span className="text-azul-oscuro">Lo ve el cliente</span>;

export function PanelServicio({
  servicio: s,
  posicion,
  alMover,
  alCerrar,
  alAvisar,
  alArchivar,
  permisos,
}: {
  servicio: Servicio | null;
  posicion?: { actual: number; total: number };
  alMover: (paso: 1 | -1) => void;
  alCerrar: () => void;
  alAvisar: (t: string) => void;
  alArchivar: (archivado: boolean) => void;
  permisos: PermisosServicio;
}) {
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [pendiente, iniciar] = useTransition();
  const faltan = s?.revision.filter((r) => !r.ok) ?? [];
  const archivo = s ? textosArchivo(s) : null;
  const whatsapp = s?.ligados.find((l) => l.contacto?.whatsapp);
  const v = s ? VARIANTES[s.tipo] : null;

  const archivar = (motivo: string, si: boolean) =>
    iniciar(async () => {
      if (!s) return;
      const r = await archivarServicio(s.id, si, motivo);
      setConfirmar(null);
      alAvisar(
        r.error ??
          (si
            ? `${s.nombre} archivado · ya no aparece al cotizar`
            : `${s.nombre} vuelve a aparecer al cotizar`),
      );
      if (!r.error) alArchivar(si);
    });

  return (
    <PanelLateral
      abierto={!!s}
      alCerrar={alCerrar}
      posicion={posicion}
      alMover={alMover}
      titulo={s?.nombre ?? ""}
      insignia={
        s ? (
          s.archivado ? (
            <Insignia tono="ambar">Archivado</Insignia>
          ) : (
            <Insignia>{nombreTipo(s.tipo)}</Insignia>
          )
        ) : null
      }
      sub={
        s ? `${s.destino} · ${s.viajes ? plural(s.viajes, "viaje", "viajes") : "sin viajes todavía"}` : null
      }
      acciones={
        whatsapp?.contacto?.whatsapp ? (
          <a
            href={ligaWhatsApp(whatsapp.contacto.whatsapp) ?? undefined}
            target="_blank"
            rel="noreferrer"
            className={BOTON_LIGA}
          >
            <IconoWhatsapp tam={15} /> WhatsApp de {whatsapp.proveedor}
          </a>
        ) : null
      }
      pie={
        s ? (
          <>
            {permisos.archivar ? (
              <Boton
                variante="secundario"
                className="h-10"
                disabled={pendiente}
                onClick={() => setConfirmar(s.archivado ? "reactivar" : "archivar")}
              >
                {s.archivado ? "Reactivar" : "Archivar"}
              </Boton>
            ) : null}
            <Link
              href={`/servicios/${s.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-campo bg-azul px-4 text-sm font-semibold text-white hover:bg-azul-oscuro"
            >
              Abrir ficha
            </Link>
          </>
        ) : null
      }
    >
      {s && v ? (
        <>
          {s.archivado && s.motivoArchivo ? (
            <Seccion titulo="Archivado" tono="ambar">
              <p className="text-[13.5px] text-tinta-2">{s.motivoArchivo}</p>
            </Seccion>
          ) : null}
          {faltan.length && !s.archivado ? (
            <Seccion
              titulo="Para completar"
              tono="ambar"
              accion={
                permisos.editar ? (
                  <Link
                    href={`/servicios/${s.id}`}
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

          <Seccion
            titulo="Lo que ve el cliente"
            extra={<span className="text-azul-oscuro">En la propuesta</span>}
          >
            <p className={`text-[13.5px] ${s.descripcion ? "text-tinta" : "text-tinta-3"}`}>
              {s.descripcion ?? "Sin descripción todavía."}
            </p>
          </Seccion>

          <Seccion titulo={v.titulo} extra="Se elige al cotizar">
            {s.variantes.length ? (
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase">
                    <th className="pb-1">{v.una}</th>
                    {s.tipo === "traslado" ? (
                      <>
                        <th className="pb-1">Pasajeros</th>
                        <th className="pb-1">Maletas</th>
                      </>
                    ) : (
                      <th className="pb-1">{v.detalle}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {s.variantes.map((x) => (
                    <tr key={x.id} className="border-t border-linea">
                      <td className="py-1.5 pr-3 align-top font-semibold">{x.nombre}</td>
                      {s.tipo === "traslado" ? (
                        <>
                          <td className="py-1.5 pr-3 align-top text-tinta-2">
                            {textoPasajeros(x.pasajeros, x.detalle)}
                          </td>
                          <td className="py-1.5 align-top text-tinta-2">{textoPasajeros(x.maletas)}</td>
                        </>
                      ) : (
                        <td className="py-1.5 align-top text-tinta-2">{x.detalle ?? "—"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[13.5px] text-tinta-3">Sin {v.varias} todavía.</p>
            )}
          </Seccion>

          <Seccion titulo="Cómo se cobra">
            <Dato etiqueta="Modelo">
              {modelo(s.modeloCobro).nombre}
              {s.notaCobro ? (
                <span className="block text-[12.5px] font-medium text-tinta-3">{s.notaCobro}</span>
              ) : null}
            </Dato>
            <p className="mt-1.5 text-[12.5px] text-tinta-3">
              La tarjeta del armador se dibuja sola con los campos de este modelo.
            </p>
          </Seccion>

          <Seccion titulo="Lo que recibe el cliente" extra={LO_VE}>
            <Dato etiqueta="Recibe">
              {s.clienteRecibe ?? "—"}
              <span className="block text-[12.5px] font-medium text-tinta-3">{comoLlega(s)}</span>
            </Dato>
            {s.enViajeConfirmado ? <Dato etiqueta="En el viaje">{s.enViajeConfirmado}</Dato> : null}
          </Seccion>

          <Seccion titulo="Dónde se puede reservar" accion={SOLO_EQUIPO}>
            {s.variaPorReserva ? (
              <Dato etiqueta="Proveedor">
                Varía por reserva
                <span className="block text-[12.5px] font-medium text-tinta-3">Datos en Proveedores</span>
              </Dato>
            ) : s.ligados.length ? (
              s.ligados.map((l) => (
                <Dato key={l.id} etiqueta={l.proveedor}>
                  {l.contacto
                    ? [l.contacto.nombre, l.contacto.paraQue, l.contacto.whatsapp ?? l.contacto.correo]
                        .filter(Boolean)
                        .join(" · ")
                    : "Sin contacto registrado"}
                  <span className="block text-[12.5px] font-medium text-tinta-3">
                    {l.idExterno ? `ID ${l.idExterno}` : "Sin ID"} ·{" "}
                    <Link
                      href={`/proveedores?p=${l.proveedorId}`}
                      className="text-azul-oscuro hover:underline"
                    >
                      datos en Proveedores
                    </Link>
                  </span>
                </Dato>
              ))
            ) : (
              <p className="text-[13.5px] text-tinta-2">
                Por definir. Se liga desde la ficha a uno de Proveedores, o se crea ahí mismo; mientras tanto
                se cotiza igual.
              </p>
            )}
            <p className="mt-1.5 text-[12.5px] text-tinta-3">
              Proveedor, moneda, pago y cancelación se eligen en cada cotización; el armador propone el último
              acuerdo con ese proveedor.
            </p>
          </Seccion>

          {s.notaInterna ? (
            <Seccion titulo="Nota interna" accion={SOLO_EQUIPO}>
              <p className="text-[13.5px] text-tinta">{s.notaInterna}</p>
            </Seccion>
          ) : null}
        </>
      ) : null}

      {s && archivo ? (
        <ConfirmarArchivo
          confirmacion={confirmar}
          nombre={s.nombre}
          objeto="servicio"
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
