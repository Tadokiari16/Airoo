"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { textoCheckin, textoEquipaje, type AerolineaIata } from "@/lib/aerolineas";
import { Boton } from "@/components/ui/boton";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { Insignia } from "@/components/ui/insignia";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { IconoMas } from "@/components/iconos";
import {
  BuscadorLista,
  Celda,
  FilaCatalogo,
  Pestanas,
  SinResultados,
  Tabla,
} from "@/components/catalogo/lista";
import { Encabezado } from "../encabezado";
import type { Aerolinea } from "./datos";
import { plural, type PermisosAerolinea } from "./textos";
import { PanelAerolinea } from "./panel";
import { NuevaAerolinea } from "./nueva";

type Vista = "todas" | "verificar" | "archivadas";

export function ListaAerolineas({
  aerolineas,
  iata,
  llegarAntes,
  inicial,
  permisos,
}: {
  aerolineas: Aerolinea[];
  iata: AerolineaIata[];
  llegarAntes: { nacional: number; internacional: number };
  inicial: string | null;
  permisos: PermisosAerolinea;
}) {
  const [filtro, setFiltro] = useState<Vista>(() =>
    aerolineas.find((a) => a.id === inicial)?.archivado ? "archivadas" : "todas",
  );
  const [texto, setTexto] = useState("");
  const [sel, setSel] = useState<string | null>(inicial);
  const [nueva, setNueva] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const pasa = useCallback((a: Aerolinea, f: Vista) => {
    if (f === "archivadas") return a.archivado;
    if (a.archivado) return false;
    if (f === "verificar") return textoCheckin(a.checkin).pendientes > 0;
    return true;
  }, []);
  const filas = useMemo(() => {
    const q = normalizar(texto);
    return aerolineas.filter((a) => pasa(a, filtro) && (!q || a.busqueda.includes(q)));
  }, [aerolineas, filtro, texto, pasa]);

  const elegida = aerolineas.find((a) => a.id === sel) ?? null;
  const pos = filas.findIndex((a) => a.id === sel);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.pathname !== "/aerolineas") return;
    if (sel) url.searchParams.set("a", sel);
    else url.searchParams.delete("a");
    window.history.replaceState(null, "", url);
  }, [sel]);

  const mover = useCallback(
    (paso: 1 | -1) => {
      if (pos < 0) return;
      const sig = filas[Math.max(0, Math.min(filas.length - 1, pos + paso))];
      if (sig) setSel(sig.id);
    },
    [filas, pos],
  );
  const cerrar = useCallback(() => setSel(null), []);
  const cuenta = (f: Vista) => aerolineas.filter((a) => pasa(a, f)).length;

  return (
    <>
      <Encabezado
        titulo="Aerolíneas"
        acciones={
          permisos.editar ? (
            <Boton onClick={() => setNueva(true)}>
              <IconoMas tam={16} /> Nueva aerolínea
            </Boton>
          ) : null
        }
      >
        Tarifas, equipaje y check-in. El vuelo se busca por número al cotizar; aquí va lo que no cambia de un
        vuelo a otro.
      </Encabezado>

      <Tarjeta>
        {aerolineas.length === 0 ? (
          <Vacio titulo="Todavía no hay aerolíneas">
            Se agregan con su código IATA, con sus tarifas y ventanas de check-in.
          </Vacio>
        ) : (
          <>
            <Pestanas
              etiqueta="Estado de las aerolíneas"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: "todas", etiqueta: "Todas", n: cuenta("todas") },
                { valor: "verificar", etiqueta: "Check-in por verificar", n: cuenta("verificar") },
                {
                  valor: "archivadas",
                  etiqueta: "Archivadas",
                  n: cuenta("archivadas"),
                  oculta: cuenta("archivadas") === 0,
                },
              ]}
            />
            <BuscadorLista valor={texto} alCambiar={setTexto} placeholder="Buscar aerolínea o código" />
            <Tabla
              columnas={[
                { titulo: "Aerolínea", ancho: "22%" },
                { titulo: "Tarifas", ancho: "22%" },
                { titulo: "Equipaje documentado", ancho: "18%" },
                { titulo: "Check-in", ancho: "17%" },
                { titulo: "Se compra", ancho: "11%" },
                { titulo: "Uso", ancho: "10%" },
              ]}
            >
              {filas.map((a) => {
                const equipaje = textoEquipaje(a.tarifas);
                const checkin = textoCheckin(a.checkin);
                return (
                  <FilaCatalogo
                    key={a.id}
                    etiqueta={a.nombre}
                    seleccionada={a.id === sel}
                    alAbrir={() => setSel(a.id)}
                  >
                    <td className="px-3.5 py-[13px] pl-[18px] align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <Codigo iata={a.iata} />
                        <div className="flex min-w-0 flex-col">
                          <span className="flex min-w-0 items-center gap-2">
                            <b className="truncate text-sm font-semibold">{a.nombre}</b>
                            {a.archivado ? <Insignia tono="ambar">Archivada</Insignia> : null}
                          </span>
                          <span className="truncate text-[12.5px] text-tinta-3">Código {a.iata}</span>
                        </div>
                      </div>
                    </td>
                    <Celda
                      titulo={a.tarifas.length ? a.tarifas.map((t) => t.nombre).join(" · ") : "Sin tarifas"}
                      sub={plural(a.tarifas.length, "tarifa", "tarifas")}
                    />
                    <Celda titulo={equipaje.titulo} sub={equipaje.sub} />
                    <Celda
                      titulo={checkin.titulo}
                      sub={checkin.sub}
                      tonoSub={checkin.pendientes ? "ambar" : "verde"}
                    />
                    <Celda titulo="En su sitio" sub="Al momento" />
                    <Celda
                      titulo={a.viajes ? plural(a.viajes, "viaje", "viajes") : "Sin viajes"}
                      sub={`desde ${a.desde}`}
                    />
                  </FilaCatalogo>
                );
              })}
            </Tabla>
            {filas.length === 0 ? (
              <SinResultados>
                {texto
                  ? `Ninguna aerolínea coincide con «${texto}».`
                  : filtro === "verificar"
                    ? "Todas las ventanas de check-in están verificadas."
                    : filtro === "archivadas"
                      ? "No hay aerolíneas archivadas."
                      : "No hay aerolíneas activas."}
              </SinResultados>
            ) : null}
          </>
        )}
      </Tarjeta>

      <PanelAerolinea
        aerolinea={elegida}
        posicion={pos >= 0 ? { actual: pos + 1, total: filas.length } : undefined}
        llegarAntes={llegarAntes}
        alMover={mover}
        alCerrar={cerrar}
        alAvisar={setAviso}
        alArchivar={(archivada) => setFiltro(archivada ? "archivadas" : "todas")}
        alEliminar={() => setSel(null)}
        permisos={permisos}
      />
      <NuevaAerolinea
        abierto={nueva}
        iata={iata}
        enCatalogo={aerolineas}
        alCerrar={() => setNueva(false)}
        alAgregar={(id, nombre) => {
          setNueva(false);
          setFiltro("todas");
          setSel(id);
          setAviso(`${nombre} agregada · faltan sus tarifas y el check-in`);
        }}
      />
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}

/** El código en un círculo, en lugar del logo. */
export function Codigo({ iata, grande = false }: { iata: string; grande?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-azul-tenue font-bold text-azul-oscuro ${grande ? "size-10 text-[13px]" : "size-8 text-[11.5px]"}`}
    >
      {iata}
    </span>
  );
}
