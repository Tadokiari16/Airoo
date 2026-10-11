"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { textoFicha } from "@/lib/hoteles";
import { Boton } from "@/components/ui/boton";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { Insignia } from "@/components/ui/insignia";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { IconoMas } from "@/components/iconos";
import {
  BuscadorLista,
  Celda,
  FilaCatalogo,
  Filtro,
  Pestanas,
  SinResultados,
  Tabla,
} from "@/components/catalogo/lista";
import { Encabezado } from "../encabezado";
import type { Hotel, OpcionCiudad } from "./datos";
import { plural, Regimenes, type PermisosHotel } from "./piezas";
import { PanelHotel } from "./panel";
import { NuevoHotel } from "./nuevo";

type Vista = "activos" | "incompletos" | "archivados";

const incompleto = (h: Hotel) => h.revision.some((r) => !r.ok);

export function ListaHoteles({
  hoteles,
  ciudades,
  inicial,
  permisos,
  agregaCiudades,
  importar,
}: {
  hoteles: Hotel[];
  ciudades: OpcionCiudad[];
  inicial: string | null;
  permisos: PermisosHotel;
  agregaCiudades: boolean;
  /** Hay una conexión de importación encendida en Configuración. */
  importar: boolean;
}) {
  const [filtro, setFiltro] = useState<Vista>(() =>
    hoteles.find((h) => h.id === inicial)?.archivado ? "archivados" : "activos",
  );
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState("");
  const [estaEn, setEstaEn] = useState("");
  const [sel, setSel] = useState<string | null>(inicial);
  const [nuevo, setNuevo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const pasa = useCallback(
    (h: Hotel, f: Vista) =>
      f === "archivados" ? h.archivado : !h.archivado && (f === "activos" || incompleto(h)),
    [],
  );
  const filas = useMemo(() => {
    const q = normalizar(texto);
    return hoteles.filter(
      (h) =>
        pasa(h, filtro) &&
        (!q || h.busqueda.includes(q)) &&
        (!destino || h.ciudadId === destino) &&
        (!estaEn || h.dondeReservar.some((d) => d.proveedorId === estaEn)),
    );
  }, [hoteles, filtro, texto, destino, estaEn, pasa]);

  // Opciones de los filtros: solo destinos y proveedores que tienen hoteles.
  const destinos = useMemo(
    () =>
      [...new Map(hoteles.map((h) => [h.ciudadId, h.ciudad])).entries()].sort((a, b) =>
        a[1].localeCompare(b[1], "es"),
      ),
    [hoteles],
  );
  const proveedores = useMemo(
    () =>
      [
        ...new Map(
          hoteles.flatMap((h) => h.dondeReservar.map((d) => [d.proveedorId, d.proveedor] as const)),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1], "es")),
    [hoteles],
  );

  const elegido = hoteles.find((h) => h.id === sel) ?? null;
  const pos = filas.findIndex((h) => h.id === sel);

  useEffect(() => {
    const url = new URL(window.location.href);
    // Al abrir una ficha la lista puede volver a pintarse; la URL ya es de la ficha.
    if (url.pathname !== "/hoteles") return;
    if (sel) url.searchParams.set("h", sel);
    else url.searchParams.delete("h");
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
  const cuenta = (f: Vista) => hoteles.filter((h) => pasa(h, f)).length;

  return (
    <>
      <Encabezado
        titulo="Hoteles"
        acciones={
          permisos.editar ? (
            <Boton onClick={() => setNuevo(true)}>
              <IconoMas tam={16} /> Nuevo hotel
            </Boton>
          ) : null
        }
      >
        Fotos, habitaciones y datos que se reutilizan en cada cotización.
      </Encabezado>

      <Tarjeta>
        {hoteles.length === 0 ? (
          <Vacio titulo="Todavía no hay hoteles">
            Los hoteles se dan de alta con su nombre y su ciudad, y la ficha se completa después.
          </Vacio>
        ) : (
          <>
            <Pestanas
              etiqueta="Estado de los hoteles"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: "activos", etiqueta: "Activos", n: cuenta("activos") },
                { valor: "incompletos", etiqueta: "Por completar", n: cuenta("incompletos") },
                { valor: "archivados", etiqueta: "Archivados", n: cuenta("archivados") },
              ]}
            />
            <BuscadorLista
              valor={texto}
              alCambiar={setTexto}
              placeholder="Buscar hotel, ciudad o ID de proveedor"
            >
              <Filtro etiqueta="Destino" valor={destino} alCambiar={setDestino} opciones={destinos} />
              <Filtro
                etiqueta="Está en"
                valor={estaEn}
                alCambiar={setEstaEn}
                opciones={proveedores}
                femenino
              />
            </BuscadorLista>
            <Tabla
              columnas={[
                { titulo: "Hotel", ancho: "28%" },
                { titulo: "Destino", ancho: "17%" },
                { titulo: "Régimen", ancho: "11%" },
                { titulo: "Habitaciones", ancho: "15%" },
                { titulo: "Ficha", ancho: "16%" },
                { titulo: "Uso", ancho: "13%" },
              ]}
            >
              {filas.map((h) => {
                const conFotos = h.habitaciones.filter((r) => r.fotos.length > 0).length;
                const faltan = h.revision.filter((r) => !r.ok);
                return (
                  <FilaCatalogo
                    key={h.id}
                    etiqueta={h.nombre}
                    seleccionada={h.id === sel}
                    alAbrir={() => setSel(h.id)}
                  >
                    <td className="px-3.5 py-[13px] pl-[18px] align-middle">
                      <span className="flex min-w-0 items-center gap-2">
                        <b className="truncate text-sm font-semibold">{h.nombre}</b>
                        {h.minima ? <Insignia tono="gris">Mínima</Insignia> : null}
                      </span>
                    </td>
                    <td className="truncate px-3.5 align-middle text-[13.5px]">{h.ciudad}</td>
                    <td className="px-3.5 align-middle">
                      {h.regimenes.length ? (
                        <Regimenes claves={h.regimenes} />
                      ) : (
                        <span className="text-tinta-3">—</span>
                      )}
                    </td>
                    {h.habitaciones.length ? (
                      <Celda
                        titulo={plural(h.habitaciones.length, "tipo", "tipos")}
                        sub={
                          conFotos === h.habitaciones.length
                            ? "todas con fotos"
                            : `${h.habitaciones.length - conFotos} sin fotos`
                        }
                        tonoSub={conFotos === h.habitaciones.length ? undefined : "ambar"}
                      />
                    ) : (
                      <Celda
                        titulo="Sin habitaciones"
                        sub="se agregan en la ficha o al cotizar"
                        tonoSub="ambar"
                      />
                    )}
                    <td
                      className="px-3.5 align-middle"
                      title={faltan.map((r) => r.falta).join(" · ") || undefined}
                    >
                      <span
                        className={`text-[13px] font-semibold ${faltan.length ? "text-ambar" : "text-verde"}`}
                      >
                        {textoFicha(h.revision)}
                      </span>
                    </td>
                    <Celda
                      titulo={h.viajes ? plural(h.viajes, "viaje", "viajes") : "Sin viajes todavía"}
                      sub={`desde ${h.desde}`}
                    />
                  </FilaCatalogo>
                );
              })}
            </Tabla>
            {filas.length === 0 ? (
              <SinResultados>
                {texto
                  ? `Ningún hotel coincide con «${texto}».`
                  : filtro === "archivados"
                    ? "No hay hoteles archivados."
                    : filtro === "incompletos"
                      ? "Todas las fichas están completas."
                      : "Ningún hotel coincide con los filtros."}
              </SinResultados>
            ) : null}
          </>
        )}
      </Tarjeta>

      <PanelHotel
        hotel={elegido}
        posicion={pos >= 0 ? { actual: pos + 1, total: filas.length } : undefined}
        alMover={mover}
        alCerrar={cerrar}
        alAvisar={setAviso}
        alArchivar={(archivado) => setFiltro(archivado ? "archivados" : "activos")}
        permisos={permisos}
      />
      <NuevoHotel
        abierto={nuevo}
        alCerrar={() => setNuevo(false)}
        ciudades={ciudades}
        agregaCiudades={agregaCiudades}
        importar={importar}
      />
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}
