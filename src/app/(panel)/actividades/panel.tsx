"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BLOQUES, cortoTipo, LLEGADAS, nombreDe, COBROS } from "@/lib/actividades";
import { ligaWhatsApp } from "@/lib/whatsapp";
import { Boton } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/insignia";
import { IconoCandado, IconoWhatsapp } from "@/components/iconos";
import { Dato, PanelLateral, Seccion } from "@/components/catalogo/panel-lateral";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import { FotosPanel } from "@/components/catalogo/fotos-panel";
import type { Actividad } from "./datos";
import { archivarActividad } from "./acciones";
import { plural, textosArchivo, type PermisosActividad } from "./textos";

const BOTON_LIGA =
  "inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave";

const SOLO_EQUIPO = (
  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-tinta-3">
    <IconoCandado tam={12} /> Solo el equipo
  </span>
);

export function PanelActividad({
  actividad: a,
  posicion,
  alMover,
  alCerrar,
  alAvisar,
  alArchivar,
  permisos,
}: {
  actividad: Actividad | null;
  posicion?: { actual: number; total: number };
  alMover: (paso: 1 | -1) => void;
  alCerrar: () => void;
  alAvisar: (t: string) => void;
  alArchivar: (archivada: boolean) => void;
  permisos: PermisosActividad;
}) {
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [pendiente, iniciar] = useTransition();
  const faltan = a?.revision.filter((r) => !r.ok) ?? [];
  const archivo = a ? textosArchivo(a) : null;
  const on = (b: keyof typeof BLOQUES) => !!a?.bloques.includes(b);
  const whatsapp = a?.ligados.find((l) => l.contacto?.whatsapp);

  const archivar = (motivo: string, si: boolean) =>
    iniciar(async () => {
      if (!a) return;
      const r = await archivarActividad(a.id, si, motivo);
      setConfirmar(null);
      alAvisar(
        r.error ??
          (si
            ? `${a.nombre} archivada · ya no aparece al cotizar`
            : `${a.nombre} vuelve a aparecer al cotizar`),
      );
      if (!r.error) alArchivar(si);
    });

  const chips = a
    ? [
        ...(on("cobro") && a.cobro ? [`Cómo se cobra: ${nombreDe(COBROS, a.cobro).toLowerCase()}`] : []),
        ...a.bloques.filter((b) => b !== "cobro").map((b) => BLOQUES[b].chip),
      ]
    : [];

  return (
    <PanelLateral
      abierto={!!a}
      alCerrar={alCerrar}
      posicion={posicion}
      alMover={alMover}
      titulo={a?.nombre ?? ""}
      insignia={
        a ? (
          a.archivado ? (
            <Insignia tono="ambar">Archivada</Insignia>
          ) : (
            <Insignia>{cortoTipo(a.tipo)}</Insignia>
          )
        ) : null
      }
      sub={
        a ? `${a.ciudad} · ${a.viajes ? plural(a.viajes, "viaje", "viajes") : "sin viajes todavía"}` : null
      }
      cabecera={
        a ? <FotosPanel portada={a.portada} galeria={a.galeria} href={`/actividades/${a.id}#fotos`} /> : null
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
        a ? (
          <>
            {permisos.archivar ? (
              <Boton
                variante="secundario"
                className="h-10"
                disabled={pendiente}
                onClick={() => setConfirmar(a.archivado ? "reactivar" : "archivar")}
              >
                {a.archivado ? "Reactivar" : "Archivar"}
              </Boton>
            ) : null}
            <Link
              href={`/actividades/${a.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-campo bg-azul px-4 text-sm font-semibold text-white hover:bg-azul-oscuro"
            >
              Abrir ficha
            </Link>
          </>
        ) : null
      }
    >
      {a ? (
        <>
          {a.archivado && a.motivoArchivo ? (
            <Seccion titulo="Archivada" tono="ambar">
              <p className="text-[13.5px] text-tinta-2">{a.motivoArchivo}</p>
            </Seccion>
          ) : null}
          {faltan.length && !a.archivado ? (
            <Seccion
              titulo="Para completar la ficha"
              tono="ambar"
              accion={
                permisos.editar ? (
                  <Link
                    href={`/actividades/${a.id}`}
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
            <p className={`mb-1.5 text-[13.5px] ${a.descripcion ? "text-tinta" : "text-tinta-3"}`}>
              {a.descripcion ?? "Sin descripción todavía."}
            </p>
            <Dato etiqueta="Duración">{a.duracion ?? "—"}</Dato>
            {on("incluye") ? (
              <>
                <Dato etiqueta="Incluye">
                  {a.incluye ?? "—"}
                  <span className="block text-[12.5px] font-medium text-tinta-3">
                    Se puede ajustar en cada cotización
                  </span>
                </Dato>
                <Dato etiqueta="No incluye">{a.noIncluye ?? "—"}</Dato>
                <Dato etiqueta="Qué llevar">{a.queLlevar ?? "—"}</Dato>
              </>
            ) : null}
            {on("llegada") ? (
              <Dato etiqueta="Cómo llega">{a.llegadaTexto ?? (nombreDe(LLEGADAS, a.llegada) || "—")}</Dato>
            ) : null}
          </Seccion>

          <Seccion titulo="Bloques encendidos" extra="Lo que pide el armador">
            {chips.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <li
                    key={c}
                    className="inline-flex h-6 items-center rounded-md bg-suave px-2 text-[12px] font-semibold text-tinta-2"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-tinta-3">Ningún bloque encendido.</p>
            )}
          </Seccion>

          {on("planes") && a.planes.length ? (
            <Seccion titulo="Planes" extra="Se elige uno al cotizar">
              <Tabla
                columnas={["Plan", "Qué incluye"]}
                filas={a.planes.map((p) => [p.nombre, p.incluye ?? "—"])}
              />
            </Seccion>
          ) : null}

          {on("boletos") && a.boletos.length ? (
            <Seccion titulo="Boletos por edad">
              <Tabla columnas={["Boleto", "Edad"]} filas={a.boletos.map((b) => [b.nombre, b.edad])} />
            </Seccion>
          ) : null}

          <Seccion titulo="Dónde se puede reservar" accion={SOLO_EQUIPO}>
            {a.sePagaEnLugar ? (
              <p className="text-[13.5px] text-tinta-2">
                Lo paga el cliente en el lugar: no se liga a ningún proveedor y no genera pagos de Airoo.
              </p>
            ) : a.ligados.length ? (
              <>
                {a.ligados.map((l) => (
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
                ))}
                <p className="mt-1.5 text-[12.5px] text-tinta-3">
                  Proveedor, moneda, pago y cancelación se eligen en cada cotización; el armador propone el
                  último acuerdo con ese proveedor.
                </p>
              </>
            ) : (
              <p className="text-[13.5px] text-tinta-2">
                Sin proveedor ligado. Se liga desde la ficha a uno de Proveedores, o se crea ahí mismo;
                mientras tanto se cotiza igual.
              </p>
            )}
          </Seccion>

          {a.notaInterna ? (
            <Seccion titulo="Nota interna" accion={SOLO_EQUIPO}>
              <p className="text-[13.5px] text-tinta">{a.notaInterna}</p>
            </Seccion>
          ) : null}
        </>
      ) : null}

      {a && archivo ? (
        <ConfirmarArchivo
          confirmacion={confirmar}
          nombre={a.nombre}
          objeto="actividad"
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

function Tabla({ columnas, filas }: { columnas: [string, string]; filas: [string, string][] }) {
  return (
    <table className="w-full text-[13.5px]">
      <thead>
        <tr>
          {columnas.map((c) => (
            <th
              key={c}
              className="pb-1 text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map(([x, y], i) => (
          <tr key={i} className="border-t border-linea">
            <td className="py-1.5 pr-3 align-top font-semibold">{x}</td>
            <td className="py-1.5 align-top text-tinta-2">{y}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
