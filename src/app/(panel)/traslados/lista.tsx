"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { textoFichaUnidad } from "@/lib/traslados";
import { Boton } from "@/components/ui/boton";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { Insignia } from "@/components/ui/insignia";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { IconoMas, IconoTraslados } from "@/components/iconos";
import { BuscadorLista, Celda, FilaCatalogo, Pestanas, SinResultados, Tabla } from "@/components/catalogo/lista";
import { Encabezado } from "../encabezado";
import type { Unidad } from "./datos";
import { plural, type PermisosTraslado } from "./textos";
import { PanelUnidad } from "./panel";
import { NuevaUnidad } from "./nueva";

type Vista = "activas" | "archivadas";

export function ListaTraslados({
  unidades,
  inicial,
  permisos,
}: {
  unidades: Unidad[];
  inicial: string | null;
  permisos: PermisosTraslado;
}) {
  const [filtro, setFiltro] = useState<Vista>(() =>
    unidades.find((u) => u.id === inicial)?.archivado ? "archivadas" : "activas",
  );
  const [texto, setTexto] = useState("");
  const [sel, setSel] = useState<string | null>(inicial);
  const [nueva, setNueva] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const pasa = useCallback((u: Unidad, f: Vista) => (f === "archivadas" ? u.archivado : !u.archivado), []);
  const filas = useMemo(() => {
    const q = normalizar(texto);
    return unidades.filter((u) => pasa(u, filtro) && (!q || u.busqueda.includes(q)));
  }, [unidades, filtro, texto, pasa]);

  const elegida = unidades.find((u) => u.id === sel) ?? null;
  const pos = filas.findIndex((u) => u.id === sel);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.pathname !== "/traslados") return;
    if (sel) url.searchParams.set("u", sel);
    else url.searchParams.delete("u");
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
  const cuenta = (f: Vista) => unidades.filter((u) => pasa(u, f)).length;

  return (
    <>
      <Encabezado
        titulo="Traslados"
        acciones={
          permisos.editar ? (
            <Boton onClick={() => setNueva(true)}>
              <IconoMas tam={16} /> Nuevo tipo de unidad
            </Boton>
          ) : null
        }
      >
        Tipos de unidad con su capacidad. La ruta, la fecha, quién lo opera y el precio se capturan en cada
        cotización.
      </Encabezado>

      <Tarjeta>
        {unidades.length === 0 ? (
          <Vacio titulo="Todavía no hay tipos de unidad">
            Se dan de alta con su nombre, pasajeros y maletas; la foto y la descripción van después.
          </Vacio>
        ) : (
          <>
            <Pestanas
              etiqueta="Estado de las unidades"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: "activas", etiqueta: "Activas", n: cuenta("activas") },
                {
                  valor: "archivadas",
                  etiqueta: "Archivadas",
                  n: cuenta("archivadas"),
                  oculta: cuenta("archivadas") === 0,
                },
              ]}
            />
            <BuscadorLista valor={texto} alCambiar={setTexto} placeholder="Buscar tipo de unidad" />
            <Tabla
              columnas={[
                { titulo: "Unidad", ancho: "30%" },
                { titulo: "Pasajeros", ancho: "12%" },
                { titulo: "Maletas", ancho: "12%" },
                { titulo: "Descripción", ancho: "22%" },
                { titulo: "Ficha", ancho: "12%" },
                { titulo: "Uso", ancho: "12%" },
              ]}
            >
              {filas.map((u) => {
                const faltan = u.revision.filter((r) => !r.ok);
                return (
                  <FilaCatalogo
                    key={u.id}
                    etiqueta={u.nombre}
                    seleccionada={u.id === sel}
                    alAbrir={() => setSel(u.id)}
                  >
                    <td className="px-3.5 py-[11px] pl-[18px] align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <Miniatura unidad={u} />
                        <span className="flex min-w-0 items-center gap-2">
                          <b className="truncate text-sm font-semibold">{u.nombre}</b>
                          {u.adaptada ? <Insignia tono="azul">Adaptada</Insignia> : null}
                          {u.archivado ? <Insignia tono="ambar">Archivada</Insignia> : null}
                        </span>
                      </div>
                    </td>
                    <Celda titulo={`Hasta ${u.pasajeros}`} sub={plural(u.pasajeros, "pasajero", "pasajeros")} />
                    <Celda titulo={`Hasta ${u.maletas}`} sub={plural(u.maletas, "maleta", "maletas")} />
                    <td className="px-3.5 align-middle">
                      <span className="line-clamp-2 text-[13px] text-tinta-2">
                        {u.descripcion ?? <span className="text-tinta-3">—</span>}
                      </span>
                    </td>
                    <td
                      className="px-3.5 align-middle"
                      title={faltan.map((r) => r.falta).join(" · ") || undefined}
                    >
                      <span
                        className={`text-[13px] font-semibold ${faltan.length ? "text-ambar" : "text-verde"}`}
                      >
                        {textoFichaUnidad(u.revision)}
                      </span>
                    </td>
                    <Celda
                      titulo={u.viajes ? plural(u.viajes, "viaje", "viajes") : "Sin viajes"}
                      sub={`desde ${u.desde}`}
                    />
                  </FilaCatalogo>
                );
              })}
            </Tabla>
            {filas.length === 0 ? (
              <SinResultados>
                {texto
                  ? `Ningún tipo de unidad coincide con «${texto}».`
                  : filtro === "archivadas"
                    ? "No hay tipos de unidad archivados."
                    : "No hay tipos de unidad activos."}
              </SinResultados>
            ) : null}
          </>
        )}
      </Tarjeta>

      <PanelUnidad
        unidad={elegida}
        posicion={pos >= 0 ? { actual: pos + 1, total: filas.length } : undefined}
        alMover={mover}
        alCerrar={cerrar}
        alAvisar={setAviso}
        alArchivar={(archivada) => setFiltro(archivada ? "archivadas" : "activas")}
        alEliminar={() => setSel(null)}
        permisos={permisos}
      />
      <NuevaUnidad
        abierto={nueva}
        alCerrar={() => setNueva(false)}
        alCrear={(id, nombre) => {
          setNueva(false);
          setFiltro("activas");
          setSel(id);
          setAviso(`${nombre} agregada · faltan su foto y su descripción`);
        }}
      />
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}

/** Foto chica de la unidad o, si no tiene, el ícono. */
export function Miniatura({ unidad, grande = false }: { unidad: Pick<Unidad, "foto">; grande?: boolean }) {
  const tam = grande ? "h-[46px] w-[70px]" : "h-9 w-[54px]";
  return unidad.foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- miniatura webp del bucket
    <img src={unidad.foto.miniatura} alt="" className={`${tam} shrink-0 rounded-lg object-cover`} />
  ) : (
    <span
      aria-hidden
      className={`${tam} inline-flex shrink-0 items-center justify-center rounded-lg bg-suave text-tinta-3`}
    >
      <IconoTraslados tam={grande ? 22 : 18} />
    </span>
  );
}
