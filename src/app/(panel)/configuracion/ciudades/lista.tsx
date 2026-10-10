"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { normalizar } from "@/lib/texto";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Insignia } from "@/components/ui/insignia";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { IconoBuscar, IconoMas } from "@/components/iconos";
import { agregarCiudad, archivarCiudad, eliminarCiudad } from "./acciones";

type Ciudad = {
  id: string;
  nombre: string;
  region: string;
  pais: string;
  busqueda: string;
  archivada: boolean;
};
type Filtro = "activas" | "archivadas";

export function ListaCiudades({ ciudades }: { ciudades: Ciudad[] }) {
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("activas");
  const [agregando, setAgregando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const q = normalizar(texto);
    return ciudades.filter(
      (c) =>
        c.archivada === (filtro === "archivadas") &&
        (!q || c.busqueda.includes(q) || normalizar(c.region).includes(q) || normalizar(c.pais).includes(q)),
    );
  }, [ciudades, texto, filtro]);

  const cuenta = (f: Filtro) => ciudades.filter((c) => c.archivada === (f === "archivadas")).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 px-[18px] pb-3">
        <label className="flex h-[34px] w-72 items-center gap-2 rounded-[10px] bg-tarjeta px-2.5 text-tinta-3 shadow-borde">
          <IconoBuscar tam={15} />
          <span className="sr-only">Buscar ciudad</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar ciudad, estado o país"
            className="flex-1 bg-transparent text-[13px] text-tinta outline-none placeholder:text-tinta-3"
          />
        </label>
        <div role="tablist" aria-label="Estado" className="flex gap-1 rounded-[10px] bg-fondo p-0.5">
          {(["activas", "archivadas"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filtro === f}
              onClick={() => setFiltro(f)}
              className={`h-[30px] rounded-lg px-3 text-[13px] font-semibold ${filtro === f ? "bg-tarjeta text-tinta shadow-[0_1px_2px_rgba(17,26,43,.1)]" : "text-tinta-2"}`}
            >
              {f === "activas" ? "Activas" : "Archivadas"}{" "}
              <span className="num text-tinta-3">{cuenta(f)}</span>
            </button>
          ))}
        </div>
        <Boton className="ml-auto" onClick={() => setAgregando(true)}>
          <IconoMas tam={15} /> Agregar ciudad
        </Boton>
      </div>

      <table className="w-full border-t border-linea text-[13.5px]">
        <thead>
          <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
            <th className="px-[18px] py-2.5 font-bold">Ciudad</th>
            <th className="px-3 py-2.5 font-bold">Estado o región</th>
            <th className="px-3 py-2.5 font-bold">País</th>
            <th className="px-[18px] py-2.5" />
          </tr>
        </thead>
        <tbody>
          {visibles.map((c) => (
            <FilaCiudad key={c.id} ciudad={c} alAvisar={setAviso} />
          ))}
        </tbody>
      </table>
      {visibles.length === 0 ? (
        <p className="border-t border-linea px-[18px] py-8 text-center text-tinta-2">
          {texto
            ? `Ninguna ciudad coincide con «${texto}».`
            : filtro === "activas"
              ? "Todavía no hay ciudades. La primera que se agregue queda disponible para todos los catálogos."
              : "No hay ciudades archivadas."}
        </p>
      ) : null}

      <Dialogo abierto={agregando} alCerrar={() => setAgregando(false)} titulo="Agregar ciudad">
        <FormularioCiudad
          inicial={texto}
          alTerminar={(nombre) => {
            setAgregando(false);
            setTexto("");
            setFiltro("activas");
            setAviso(`${nombre} quedó en la lista para todos los catálogos`);
          }}
        />
      </Dialogo>
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}

function FilaCiudad({ ciudad: c, alAvisar }: { ciudad: Ciudad; alAvisar: (t: string) => void }) {
  const [pendiente, iniciar] = useTransition();
  const [confirmar, setConfirmar] = useState<null | "archivar" | "eliminar">(null);
  return (
    <tr className="border-t border-linea">
      <td className="px-[18px] py-2.5 font-semibold">{c.nombre}</td>
      <td className="px-3 py-2.5 text-tinta-2">{c.region}</td>
      <td className="px-3 py-2.5 text-tinta-2">{c.pais}</td>
      <td className="px-[18px] py-2 text-right whitespace-nowrap">
        {c.archivada ? (
          <span className="inline-flex items-center gap-2">
            <Insignia tono="gris">Archivada</Insignia>
            <Boton
              variante="secundario"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  await archivarCiudad(c.id, false);
                  alAvisar(`${c.nombre} está activa otra vez`);
                })
              }
            >
              Reactivar
            </Boton>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Boton variante="secundario" disabled={pendiente} onClick={() => setConfirmar("archivar")}>
              Archivar
            </Boton>
            <Boton variante="secundario" disabled={pendiente} onClick={() => setConfirmar("eliminar")}>
              Eliminar
            </Boton>
          </span>
        )}
        <Dialogo
          abierto={confirmar !== null}
          alCerrar={() => setConfirmar(null)}
          titulo={confirmar === "eliminar" ? `¿Eliminar ${c.nombre}?` : `¿Archivar ${c.nombre}?`}
        >
          <div className="text-left">
            {confirmar === "eliminar" ? (
              <p className="text-tinta-2">
                Sale de la lista por completo. Solo se puede porque todavía no la usa ningún hotel, actividad
                ni viaje.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-tinta-2">
                <li>Deja de aparecer al elegir ciudad en hoteles, actividades y viajes.</li>
                <li>Lo que ya la usa no cambia.</li>
                <li>Se puede reactivar en cualquier momento.</li>
              </ul>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => setConfirmar(null)}>
                Cancelar
              </Boton>
              <Boton
                variante={confirmar === "eliminar" ? "peligro" : "principal"}
                onClick={() => {
                  const que = confirmar;
                  setConfirmar(null);
                  iniciar(async () => {
                    if (que === "eliminar") {
                      const r = await eliminarCiudad(c.id);
                      alAvisar(r.error ?? `${c.nombre} salió de la lista`);
                    } else {
                      await archivarCiudad(c.id, true);
                      alAvisar(`${c.nombre} archivada · ya no aparece al elegir ciudad`);
                    }
                  });
                }}
              >
                {confirmar === "eliminar" ? "Eliminar ciudad" : "Archivar ciudad"}
              </Boton>
            </div>
          </div>
        </Dialogo>
      </td>
    </tr>
  );
}

function FormularioCiudad({
  inicial,
  alTerminar,
}: {
  inicial: string;
  alTerminar: (nombre: string) => void;
}) {
  const [estado, accion, enviando] = useActionState(
    async (prev: Awaited<ReturnType<typeof agregarCiudad>>, datos: FormData) => {
      const r = await agregarCiudad(prev, datos);
      if (r && "creada" in r) alTerminar(r.creada);
      return r;
    },
    undefined,
  );
  const parecidas = estado && "parecidas" in estado ? estado : null;

  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo
        etiqueta="Ciudad"
        name="nombre"
        defaultValue={parecidas?.datos.nombre ?? inicial}
        placeholder="Ej. San Cristóbal de las Casas"
        required
      />
      <Campo
        etiqueta="Estado o región"
        name="region"
        defaultValue={parecidas?.datos.region}
        placeholder="Ej. Chiapas"
        required
      />
      <Campo etiqueta="País" name="pais" defaultValue={parecidas?.datos.pais ?? "México"} required />

      {parecidas ? (
        <div role="status" className="rounded-campo bg-ambar-tenue px-3 py-3 text-[13px] text-ambar">
          <p className="font-semibold">Ya hay ciudades con nombre parecido</p>
          <ul className="mt-1.5 space-y-0.5 text-tinta">
            {parecidas.parecidas.map((p) => (
              <li key={p.id}>
                {p.nombre} · {p.region}, {p.pais}
                {p.archivada ? <span className="text-tinta-3"> (archivada)</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-1.5">Si es otra ciudad, se puede agregar de todos modos.</p>
          <input type="hidden" name="confirmar" value="si" />
        </div>
      ) : null}
      {estado && "error" in estado ? (
        <p role="alert" className="text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}

      <Boton type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : parecidas ? "Agregar de todos modos" : "Agregar a la lista"}
      </Boton>
    </form>
  );
}
