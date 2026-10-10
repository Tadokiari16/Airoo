"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { cortoTipo, textoCobro, textoFicha, TIPOS } from "@/lib/actividades";
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
import type { OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import { Encabezado } from "../encabezado";
import type { Actividad } from "./datos";
import { plural, textoDonde, type PermisosActividad } from "./textos";
import { PanelActividad } from "./panel";
import { NuevaActividad } from "./nueva";

type Vista = "activas" | "incompletas" | "lugar" | "archivadas";

const incompleta = (a: Actividad) => a.revision.some((r) => !r.ok);

export function ListaActividades({
  actividades,
  ciudades,
  inicial,
  permisos,
  agregaCiudades,
}: {
  actividades: Actividad[];
  ciudades: OpcionCiudad[];
  inicial: string | null;
  permisos: PermisosActividad;
  agregaCiudades: boolean;
}) {
  const [filtro, setFiltro] = useState<Vista>(() =>
    actividades.find((a) => a.id === inicial)?.archivado ? "archivadas" : "activas",
  );
  const [texto, setTexto] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [tipo, setTipo] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [sel, setSel] = useState<string | null>(inicial);
  const [nueva, setNueva] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const pasa = useCallback((a: Actividad, f: Vista) => {
    if (f === "archivadas") return a.archivado;
    if (a.archivado) return false;
    if (f === "incompletas") return incompleta(a);
    if (f === "lugar") return a.sePagaEnLugar;
    return true;
  }, []);
  const filas = useMemo(() => {
    const q = normalizar(texto);
    return actividades.filter(
      (a) =>
        pasa(a, filtro) &&
        (!q || a.busqueda.includes(q)) &&
        (!ciudad || a.ciudadId === ciudad) &&
        (!tipo || a.tipo === tipo) &&
        (!proveedor || a.ligados.some((l) => l.proveedorId === proveedor)),
    );
  }, [actividades, filtro, texto, ciudad, tipo, proveedor, pasa]);

  // Opciones de los filtros: solo lo que tienen las actividades.
  const ciudades_ = useMemo(
    () =>
      [...new Map(actividades.map((a) => [a.ciudadId, a.ciudad])).entries()].sort((x, y) =>
        x[1].localeCompare(y[1], "es"),
      ),
    [actividades],
  );
  const tipos = useMemo(
    () =>
      TIPOS.filter((t) => actividades.some((a) => a.tipo === t.valor)).map(
        (t) => [t.valor, t.corto] as [string, string],
      ),
    [actividades],
  );
  const proveedores = useMemo(
    () =>
      [
        ...new Map(
          actividades.flatMap((a) => a.ligados.map((l) => [l.proveedorId, l.proveedor] as const)),
        ).entries(),
      ].sort((x, y) => x[1].localeCompare(y[1], "es")),
    [actividades],
  );

  const elegida = actividades.find((a) => a.id === sel) ?? null;
  const pos = filas.findIndex((a) => a.id === sel);

  useEffect(() => {
    const url = new URL(window.location.href);
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
  const cuenta = (f: Vista) => actividades.filter((a) => pasa(a, f)).length;

  return (
    <>
      <Encabezado
        titulo="Actividades"
        acciones={
          permisos.editar ? (
            <Boton onClick={() => setNueva(true)}>
              <IconoMas tam={16} /> Nueva actividad
            </Boton>
          ) : null
        }
      >
        Parques, tours, day passes y experiencias. Aquí se describe cada una; precio, fecha y personas se
        capturan al cotizar.
      </Encabezado>

      <Tarjeta>
        {actividades.length === 0 ? (
          <Vacio titulo="Todavía no hay actividades">
            Las actividades se dan de alta con nombre, ciudad y tipo, y la ficha se completa después.
          </Vacio>
        ) : (
          <>
            <Pestanas
              etiqueta="Estado de las actividades"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: "activas", etiqueta: "Activas", n: cuenta("activas") },
                { valor: "incompletas", etiqueta: "Por completar", n: cuenta("incompletas") },
                { valor: "lugar", etiqueta: "Las paga el cliente en el lugar", n: cuenta("lugar") },
                {
                  valor: "archivadas",
                  etiqueta: "Archivadas",
                  n: cuenta("archivadas"),
                  oculta: cuenta("archivadas") === 0,
                },
              ]}
            />
            <BuscadorLista valor={texto} alCambiar={setTexto} placeholder="Buscar actividad, destino o ID">
              <Filtro etiqueta="Ciudad" valor={ciudad} alCambiar={setCiudad} opciones={ciudades_} femenino />
              <Filtro etiqueta="Tipo" valor={tipo} alCambiar={setTipo} opciones={tipos} />
              <Filtro
                etiqueta="Proveedor"
                valor={proveedor}
                alCambiar={setProveedor}
                opciones={proveedores}
              />
            </BuscadorLista>
            <Tabla
              columnas={[
                { titulo: "Actividad", ancho: "26%" },
                { titulo: "Tipo", ancho: "13%" },
                { titulo: "Cómo se cobra", ancho: "18%" },
                { titulo: "Dónde se reserva", ancho: "17%" },
                { titulo: "Ficha", ancho: "15%" },
                { titulo: "Uso", ancho: "11%" },
              ]}
            >
              {filas.map((a) => {
                const cobro = textoCobro({
                  bloques: a.bloques,
                  cobro: a.cobro,
                  planes: a.planes.map((p) => p.nombre),
                  boletos: a.boletos.map((b) => b.nombre),
                  maxPersonasGrupo: a.maxPersonasGrupo,
                });
                const donde = textoDonde(a);
                const faltan = a.revision.filter((r) => !r.ok);
                return (
                  <FilaCatalogo
                    key={a.id}
                    etiqueta={a.nombre}
                    seleccionada={a.id === sel}
                    alAbrir={() => setSel(a.id)}
                  >
                    <td className="px-3.5 py-[13px] pl-[18px] align-middle">
                      <div className="flex min-w-0 flex-col">
                        <span className="flex min-w-0 items-center gap-2">
                          <b className="truncate text-sm font-semibold">{a.nombre}</b>
                          {a.archivado ? <Insignia tono="ambar">Archivada</Insignia> : null}
                        </span>
                        <span className="truncate text-[12.5px] text-tinta-3">
                          {a.ciudad}
                          {a.minima ? " · ficha mínima" : ""}
                        </span>
                      </div>
                    </td>
                    <Celda titulo={cortoTipo(a.tipo)} sub={a.duracion ?? "Sin duración"} />
                    <Celda titulo={cobro.titulo} sub={cobro.sub} />
                    <Celda
                      titulo={donde.titulo}
                      sub={donde.sub}
                      tonoSub={donde.ambar ? "ambar" : undefined}
                    />
                    <td
                      className="px-3.5 align-middle"
                      title={faltan.map((r) => r.falta).join(" · ") || undefined}
                    >
                      <div className="flex min-w-0 flex-col">
                        <b className="truncate text-sm font-semibold">
                          {faltan.length ? "Por completar" : "Completa"}
                        </b>
                        <span
                          className={`truncate text-[12.5px] ${faltan.length ? "font-semibold text-ambar" : "text-tinta-3"}`}
                        >
                          {faltan.length ? textoFicha(a.revision) : "Lista para cotizar"}
                        </span>
                      </div>
                    </td>
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
                  ? `Ninguna actividad coincide con «${texto}».`
                  : filtro === "archivadas"
                    ? "No hay actividades archivadas."
                    : filtro === "incompletas"
                      ? "Todas las fichas están completas."
                      : filtro === "lugar"
                        ? "Ninguna actividad se paga en el lugar."
                        : "Ninguna actividad coincide con los filtros."}
              </SinResultados>
            ) : null}
          </>
        )}
      </Tarjeta>

      <PanelActividad
        actividad={elegida}
        posicion={pos >= 0 ? { actual: pos + 1, total: filas.length } : undefined}
        alMover={mover}
        alCerrar={cerrar}
        alAvisar={setAviso}
        alArchivar={(archivada) => setFiltro(archivada ? "archivadas" : "activas")}
        permisos={permisos}
      />
      <NuevaActividad
        abierto={nueva}
        alCerrar={() => setNueva(false)}
        ciudades={ciudades}
        agregaCiudades={agregaCiudades}
      />
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}
