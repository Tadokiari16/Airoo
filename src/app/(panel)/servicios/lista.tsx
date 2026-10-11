"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { grupoDe, modelo, nombreTipo, textoVariantes } from "@/lib/servicios";
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
import type { Servicio } from "./datos";
import { comoLlega, plural, textoDonde, type PermisosServicio } from "./textos";
import { PanelServicio } from "./panel";
import { NuevoServicio } from "./nuevo";

type Vista = "todos" | "seguros" | "extras" | "archivados";

export function ListaServicios({
  servicios,
  inicial,
  permisos,
}: {
  servicios: Servicio[];
  inicial: string | null;
  permisos: PermisosServicio;
}) {
  const [filtro, setFiltro] = useState<Vista>(() =>
    servicios.find((s) => s.id === inicial)?.archivado ? "archivados" : "todos",
  );
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState("");
  const [sel, setSel] = useState<string | null>(inicial);
  const [nuevo, setNuevo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const pasa = useCallback((s: Servicio, f: Vista) => {
    if (f === "archivados") return s.archivado;
    if (s.archivado) return false;
    return f === "todos" || grupoDe(s.tipo) === f;
  }, []);
  const filas = useMemo(() => {
    const q = normalizar(texto);
    return servicios.filter(
      (s) => pasa(s, filtro) && (!q || s.busqueda.includes(q)) && (!destino || s.destino === destino),
    );
  }, [servicios, filtro, texto, destino, pasa]);

  const destinos = useMemo(
    () =>
      [...new Set(servicios.map((s) => s.destino))]
        .sort((x, y) => x.localeCompare(y, "es"))
        .map((d) => [d, d] as [string, string]),
    [servicios],
  );

  const elegido = servicios.find((s) => s.id === sel) ?? null;
  const pos = filas.findIndex((s) => s.id === sel);

  useEffect(() => {
    const url = new URL(window.location.href);
    // Al abrir una ficha la lista puede volver a pintarse; la URL ya es de la ficha.
    if (url.pathname !== "/servicios") return;
    if (sel) url.searchParams.set("s", sel);
    else url.searchParams.delete("s");
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
  const cuenta = (f: Vista) => servicios.filter((s) => pasa(s, f)).length;

  return (
    <>
      <Encabezado
        titulo="Servicios"
        acciones={
          permisos.editar ? (
            <Boton onClick={() => setNuevo(true)}>
              <IconoMas tam={16} /> Nuevo servicio
            </Boton>
          ) : null
        }
      >
        Seguros y extras. Cada tipo define cómo se cobra y qué recibe el cliente; los traslados están en su
        propio catálogo.
      </Encabezado>

      <Tarjeta>
        {servicios.length === 0 ? (
          <Vacio titulo="Todavía no hay servicios">
            Seguros, eSIM y otros extras, cada uno con su forma de cobro.
          </Vacio>
        ) : (
          <>
            <Pestanas
              etiqueta="Tipos de servicio"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: "todos", etiqueta: "Todos", n: cuenta("todos") },
                { valor: "seguros", etiqueta: "Seguros", n: cuenta("seguros") },
                { valor: "extras", etiqueta: "Extras", n: cuenta("extras") },
                {
                  valor: "archivados",
                  etiqueta: "Archivados",
                  n: cuenta("archivados"),
                  oculta: cuenta("archivados") === 0,
                },
              ]}
            />
            <BuscadorLista valor={texto} alCambiar={setTexto} placeholder="Buscar servicio o proveedor">
              <Filtro etiqueta="Destino" valor={destino} alCambiar={setDestino} opciones={destinos} />
            </BuscadorLista>
            <Tabla
              columnas={[
                { titulo: "Servicio", ancho: "27%" },
                { titulo: "Tipo", ancho: "12%" },
                { titulo: "Se cobra", ancho: "14%" },
                { titulo: "Dónde se reserva", ancho: "17%" },
                { titulo: "El cliente recibe", ancho: "19%" },
                { titulo: "Uso", ancho: "11%" },
              ]}
            >
              {filas.map((s) => {
                const donde = textoDonde(s);
                const m = modelo(s.modeloCobro);
                return (
                  <FilaCatalogo
                    key={s.id}
                    etiqueta={s.nombre}
                    seleccionada={s.id === sel}
                    alAbrir={() => setSel(s.id)}
                  >
                    <td className="px-3.5 py-[13px] pl-[18px] align-middle">
                      <div className="flex min-w-0 flex-col">
                        <span className="flex min-w-0 items-center gap-2">
                          <b className="truncate text-sm font-semibold">{s.nombre}</b>
                          {s.archivado ? <Insignia tono="ambar">Archivado</Insignia> : null}
                        </span>
                        <span className="truncate text-[12.5px] text-tinta-3">{s.destino}</span>
                      </div>
                    </td>
                    <Celda titulo={nombreTipo(s.tipo)} sub={textoVariantes(s.tipo, s.variantes.length)} />
                    <Celda titulo={m.nombre} sub={m.sub} />
                    <Celda
                      titulo={donde.titulo}
                      sub={donde.sub}
                      tonoSub={donde.ambar ? "ambar" : undefined}
                    />
                    <Celda
                      titulo={s.clienteRecibe ?? "Sin definir"}
                      sub={s.clienteRecibe ? comoLlega(s) : "Falta qué recibe el cliente"}
                      tonoSub={s.clienteRecibe ? undefined : "ambar"}
                    />
                    <Celda
                      titulo={s.viajes ? plural(s.viajes, "viaje", "viajes") : "Sin viajes"}
                      sub={`desde ${s.desde}`}
                    />
                  </FilaCatalogo>
                );
              })}
            </Tabla>
            {filas.length === 0 ? (
              <SinResultados>
                {texto
                  ? `Ningún servicio coincide con «${texto}».`
                  : filtro === "archivados"
                    ? "No hay servicios archivados."
                    : "Ningún servicio coincide con los filtros."}
              </SinResultados>
            ) : null}
          </>
        )}
      </Tarjeta>

      <PanelServicio
        servicio={elegido}
        posicion={pos >= 0 ? { actual: pos + 1, total: filas.length } : undefined}
        alMover={mover}
        alCerrar={cerrar}
        alAvisar={setAviso}
        alArchivar={(archivado) => setFiltro(archivado ? "archivados" : "todos")}
        permisos={permisos}
      />
      <NuevoServicio abierto={nuevo} alCerrar={() => setNuevo(false)} />
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}
