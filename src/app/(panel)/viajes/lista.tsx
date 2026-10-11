"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ALCANCES, BARRA, ETAPAS, entraEnAlcance, nombreEtapa, type Alcance } from "@/lib/etapas";
import { ligaWhatsApp } from "@/lib/whatsapp";
import { Boton } from "@/components/ui/boton";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { Insignia } from "@/components/ui/insignia";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { IconoMas, IconoWhatsapp } from "@/components/iconos";
import { FilaCatalogo, Filtro, SinResultados, Tabla } from "@/components/catalogo/lista";
import { PanelLateral, Seccion } from "@/components/catalogo/panel-lateral";
import type { OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import type { FilaViaje } from "./datos";
import { NotaNueva } from "./nota-interna";
import { AvatarACargo, Etiqueta, Punto, tonoEtapa } from "./piezas";
import { NuevoViaje } from "./nuevo";

const TURNOS = ["Airoo", "Cliente", "Proveedor", "Todo listo"] as const;

export function ListaViajes({
  viajes,
  saludo,
  fecha,
  inicial,
  abrirNuevo,
  creaViajes,
  eligeACargo,
  agregaCiudades,
  ciudades,
  equipo,
  yo,
}: {
  viajes: FilaViaje[];
  saludo: string;
  fecha: string;
  inicial: string | null;
  abrirNuevo: boolean;
  creaViajes: boolean;
  eligeACargo: boolean;
  agregaCiudades: boolean;
  ciudades: OpcionCiudad[];
  equipo: { id: string; nombre: string }[];
  yo: string;
}) {
  const [alcance, setAlcance] = useState<Alcance>("curso");
  const [etapa, setEtapa] = useState("");
  const [turno, setTurno] = useState("");
  const [aCargo, setACargo] = useState("");
  const [sel, setSel] = useState<string | null>(inicial);
  const [nuevo, setNuevo] = useState(abrirNuevo);
  const [aviso, setAviso] = useState<string | null>(null);

  const enAlcance = useMemo(
    () => viajes.filter((v) => entraEnAlcance(alcance, v.situacion.alcance)),
    [viajes, alcance],
  );
  const filas = useMemo(
    () =>
      enAlcance
        .filter(
          (v) =>
            (!etapa || v.etapa === etapa) &&
            (!turno || v.situacion.turno === turno) &&
            (!aCargo || v.aCargo?.id === aCargo),
        )
        // Primero lo que espera a Airoo.
        .sort((a, b) => Number(b.situacion.turno === "Airoo") - Number(a.situacion.turno === "Airoo")),
    [enAlcance, etapa, turno, aCargo],
  );
  const esperan = viajes.filter((v) => v.situacion.turno === "Airoo" && v.situacion.alcance !== "fin").length;
  const actual = viajes.find((v) => v.id === sel) ?? null;
  const pos = filas.findIndex((v) => v.id === sel);
  const mover = useCallback(
    (paso: 1 | -1) => {
      const i = filas.findIndex((v) => v.id === sel);
      const n = filas[i + paso];
      if (i >= 0 && n) setSel(n.id);
    },
    [filas, sel],
  );
  const cerrar = useCallback(() => setSel(null), []);
  const hayFiltros = !!(etapa || turno || aCargo);

  const etapasEnLista = (alcance === "curso" ? BARRA : ETAPAS).map((e) => [e.valor, e.nombre] as [string, string]);
  const personas = [...new Map(viajes.filter((v) => v.aCargo).map((v) => [v.aCargo!.id, v.aCargo!])).values()].map(
    (a) => [a.id, a.id === yo ? "Tú" : a.nombre] as [string, string],
  );

  return (
    <>
      <div className="mt-[26px] mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] first-letter:text-azul">{saludo}</h1>
          <p className="num mt-1 text-[14.5px] text-tinta-2">{fecha}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {creaViajes ? (
            <Boton onClick={() => setNuevo(true)}>
              <IconoMas tam={16} /> Nuevo viaje
            </Boton>
          ) : null}
          <button
            type="button"
            aria-pressed={turno === "Airoo"}
            onClick={() => setTurno(turno === "Airoo" ? "" : "Airoo")}
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-campo px-3.5 text-[13.5px] text-tinta-2 ${turno === "Airoo" ? "bg-azul-tenue shadow-[inset_0_0_0_1.5px_var(--color-azul)]" : "bg-tarjeta shadow-borde"}`}
          >
            <Punto tono="azul" />
            <b className="num text-[15px] text-tinta">{esperan}</b>
            {esperan === 1 ? "viaje espera a Airoo" : "viajes esperan a Airoo"}
          </button>
        </div>
      </div>

      <Tarjeta>
        <div className="flex flex-wrap items-center gap-2.5 px-[18px] pt-4 pb-3.5">
          <h2 className="mr-auto text-[17px] font-bold">Viajes</h2>
          {hayFiltros ? (
            <Boton
              variante="texto"
              onClick={() => {
                setEtapa("");
                setTurno("");
                setACargo("");
              }}
            >
              Quitar filtros
            </Boton>
          ) : null}
          <Filtro etiqueta="Etapa" valor={etapa} alCambiar={setEtapa} opciones={etapasEnLista} femenino />
          <Filtro etiqueta="Turno" valor={turno} alCambiar={setTurno} opciones={TURNOS.map((t) => [t, t])} />
          <Filtro etiqueta="A cargo" valor={aCargo} alCambiar={setACargo} opciones={personas} />
          <Filtro
            etiqueta="Mostrar"
            valor={alcance === "curso" ? "" : alcance}
            alCambiar={(v) => setAlcance((v || "curso") as Alcance)}
            sinFiltro="En curso"
            opciones={ALCANCES.filter((a) => a.valor !== "curso").map((a) => [a.valor, a.nombre])}
          />
        </div>
        {viajes.length === 0 ? (
          <div className="border-t border-linea">
            <Vacio titulo="Todavía no hay viajes">
              Cada viaje aparece aquí con sus fechas, su etapa, lo que lleva invertido y quién lo tiene a cargo.
            </Vacio>
          </div>
        ) : filas.length === 0 ? (
          <SinResultados>No hay viajes con estos filtros.</SinResultados>
        ) : (
          <Tabla
            columnas={[
              { titulo: "Viaje", ancho: "27%" },
              { titulo: "Fechas", ancho: "12%" },
              { titulo: "Etapa", ancho: "15%" },
              { titulo: "Inversión", ancho: "14%" },
              { titulo: "Última actividad", ancho: "24%" },
              { titulo: "A cargo", ancho: "8%" },
            ]}
          >
            {filas.map((v) => (
              <FilaCatalogo
                key={v.id}
                seleccionada={v.id === sel}
                alAbrir={() => setSel(v.id)}
                etiqueta={`${v.cliente} · ${v.folioTexto}`}
              >
                <td className="py-[13px] pr-3.5 pl-[18px] align-middle">
                  <div className="flex min-w-0 flex-col">
                    <b className="flex items-center gap-2 truncate text-sm font-semibold">
                      {v.cliente}
                      {v.ejemplo ? <Etiqueta>Ejemplo</Etiqueta> : null}
                    </b>
                    <span className="truncate text-[12.5px] text-tinta-2">
                      <span className="num text-tinta-3">{v.folioTexto}</span> {v.destino} · {v.personas}
                    </span>
                  </div>
                </td>
                <td className="px-3.5 py-[13px] align-middle">
                  <div className="num text-sm">{v.fechas}</div>
                  <div className="text-[12.5px] text-tinta-3">{v.noches}</div>
                </td>
                <td className="px-3.5 py-[13px] align-middle">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Punto tono={tonoEtapa(v.etapa, v.situacion)} />
                    {nombreEtapa(v.etapa)}
                  </div>
                  <div
                    className={`text-[12.5px] ${v.situacion.turno === "Airoo" ? "font-semibold text-azul-oscuro" : "text-tinta-3"}`}
                  >
                    {v.situacion.sub}
                  </div>
                </td>
                <td className="px-3.5 py-[13px] align-middle">
                  {v.inversion.monto ? <div className="num text-sm font-semibold">{v.inversion.monto}</div> : null}
                  {v.inversion.sub ? <div className="text-[12.5px] text-tinta-3">{v.inversion.sub}</div> : null}
                </td>
                <td className="px-3.5 py-[13px] align-middle">
                  {v.ultima ? (
                    <>
                      <div className="truncate text-sm font-semibold">{v.ultima.texto}</div>
                      <div className="flex items-center gap-2 truncate text-[12.5px] text-tinta-3">
                        {v.ultima.cuando}
                        {v.ultima.etiqueta ? <Etiqueta>{v.ultima.etiqueta}</Etiqueta> : null}
                      </div>
                    </>
                  ) : null}
                </td>
                <td className="px-3.5 py-[13px] text-right align-middle">
                  <AvatarACargo a={v.aCargo} />
                </td>
              </FilaCatalogo>
            ))}
          </Tabla>
        )}
      </Tarjeta>

      {actual ? (
        <PanelViaje
          v={actual}
          abierto={!!sel}
          alCerrar={cerrar}
          alMover={mover}
          posicion={pos >= 0 ? { actual: pos + 1, total: filas.length } : undefined}
          alAvisar={setAviso}
        />
      ) : null}

      {creaViajes ? (
        <NuevoViaje
          abierto={nuevo}
          alCerrar={() => setNuevo(false)}
          ciudades={ciudades}
          equipo={equipo}
          eligeACargo={eligeACargo}
          agregaCiudades={agregaCiudades}
          yo={yo}
        />
      ) : null}
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}

function PanelViaje({
  v,
  abierto,
  alCerrar,
  alMover,
  posicion,
  alAvisar,
}: {
  v: FilaViaje;
  abierto: boolean;
  alCerrar: () => void;
  alMover: (p: 1 | -1) => void;
  posicion?: { actual: number; total: number };
  alAvisar: (t: string) => void;
}) {
  const wa = v.whatsapp ? ligaWhatsApp(v.whatsapp) : null;
  return (
    <PanelLateral
      abierto={abierto}
      alCerrar={alCerrar}
      alMover={alMover}
      posicion={posicion}
      titulo={v.cliente}
      insignia={<Insignia tono={v.situacion.turno === "Airoo" ? "azul" : "gris"}>{nombreEtapa(v.etapa)}</Insignia>}
      sub={
        <>
          <span className="num">{v.folioTexto}</span> · {v.destino} · {v.fechas} · {v.personas}
        </>
      }
      acciones={
        <>
          <Link
            href={`/viajes/${v.folio}`}
            className="inline-flex h-[34px] items-center rounded-[10px] bg-azul px-3 text-[13px] font-semibold text-white hover:bg-azul-oscuro"
          >
            Abrir viaje
          </Link>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
            >
              <IconoWhatsapp tam={15} /> WhatsApp
            </a>
          ) : null}
        </>
      }
    >
      <Seccion titulo="Nota interna" extra="Solo el equipo">
        {v.nota ? (
          <p className="mb-2 text-[13.5px]">
            {v.nota.texto}
            <span className="block text-[12px] text-tinta-3">
              {v.nota.quien ?? "El equipo"} · {v.nota.cuando}
            </span>
          </p>
        ) : null}
        <NotaNueva viajeId={v.id} alAvisar={alAvisar} />
      </Seccion>

      <Seccion titulo="Servicios">
        {v.servicios.length ? (
          <ul className="flex flex-col">
            {v.servicios.map((s, i) => (
              <li key={i} className="border-t border-linea py-1.5 text-[13.5px] first:border-t-0">
                <b className="font-semibold">{s.nombre}</b>
                {s.detalle ? <span className="block text-[12.5px] text-tinta-3">{s.detalle}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-tinta-2">Todavía no tiene servicios. Se agregan en el armador.</p>
        )}
      </Seccion>

      <Seccion
        titulo="Actividad"
        accion={
          <Link href={`/viajes/${v.folio}?p=historial`} className="text-[13px] font-semibold text-azul-oscuro hover:underline">
            Ver historial completo
          </Link>
        }
      >
        <ul className="flex flex-col gap-2">
          {v.actividad.map((e, i) => (
            <li key={e.id} className="flex gap-2.5 text-[13.5px]">
              <span className={`mt-1.5 size-[7px] shrink-0 rounded-full ${i === 0 ? "bg-azul" : "bg-tinta-3/40"}`} />
              <div>
                <b className="font-semibold">{e.texto}</b>
                <span className="flex items-center gap-2 text-[12.5px] text-tinta-3">
                  {e.cuando}
                  {e.etiqueta ? <Etiqueta>{e.etiqueta}</Etiqueta> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Seccion>

      {v.situacion.alcance === "borr" ? (
        <Seccion titulo="Quién abrió su enlace">
          <p className="text-[13.5px] text-tinta-2">Todavía no se envía al cliente.</p>
        </Seccion>
      ) : null}

      {v.inversion.monto ? (
        <Seccion titulo="Total del viaje">
          <p className="num text-[17px] font-bold">{v.inversion.monto}</p>
          {v.inversion.sub ? <p className="text-[12.5px] text-tinta-3">{v.inversion.sub}</p> : null}
        </Seccion>
      ) : null}
    </PanelLateral>
  );
}
