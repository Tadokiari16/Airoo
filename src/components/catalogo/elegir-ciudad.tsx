"use client";

import { useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { agregarCiudad, type ResultadoCiudad } from "@/app/(panel)/configuracion/ciudades/acciones";

export type OpcionCiudad = { id: string; nombre: string; detalle: string; busqueda: string };

/**
 * Busca en la lista de ciudades que comparten todos los catálogos. Solo el
 * dueño agrega ciudades; se avisa si ya hay una con nombre parecido.
 * Manda el valor elegido como «ciudadId».
 */
export function ElegirCiudad({
  ciudades: iniciales,
  agregaCiudades,
  valor: ciudadId,
  alCambiar: setCiudadId,
  etiqueta = "Ciudad",
  nombre = "ciudadId",
}: {
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
  valor: string;
  alCambiar: (id: string) => void;
  etiqueta?: string;
  /** Nombre del campo oculto que manda el formulario. */
  nombre?: string;
}) {
  const [ciudades, setCiudades] = useState(iniciales);
  const [busqueda, setBusqueda] = useState("");
  const [agregando, setAgregando] = useState(false);
  const ciudad = ciudades.find((c) => c.id === ciudadId);
  const coinciden = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return [];
    return ciudades.filter((c) => c.busqueda.includes(q)).slice(0, 5);
  }, [ciudades, busqueda]);

  return (
    <>
      <input type="hidden" name={nombre} value={ciudadId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`buscar-${nombre}`} className="text-[13px] font-semibold">
          {etiqueta}
        </label>
        {ciudad ? (
          <div className="flex h-10 items-center gap-2 rounded-campo bg-azul-tenue px-3 text-sm shadow-[inset_0_0_0_1.5px_var(--color-azul)]">
            <b className="font-semibold">{ciudad.nombre}</b>
            <span className="text-tinta-2">{ciudad.detalle}</span>
            <button
              type="button"
              className="ml-auto cursor-pointer text-[13px] font-semibold text-azul-oscuro hover:underline"
              onClick={() => {
                setCiudadId("");
                setBusqueda("");
              }}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              id={`buscar-${nombre}`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en la lista de ciudades"
              autoComplete="off"
              className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
            />
            {coinciden.length ? (
              <ul role="listbox" aria-label="Ciudades" className="overflow-hidden rounded-campo shadow-borde">
                {coinciden.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => setCiudadId(c.id)}
                      className="flex w-full cursor-pointer items-baseline gap-2 border-t border-linea px-3 py-2 text-left text-sm first:border-t-0 hover:bg-suave"
                    >
                      <b className="font-semibold">{c.nombre}</b>
                      <span className="text-[12.5px] text-tinta-3">{c.detalle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : busqueda ? (
              <p className="text-[12.5px] text-tinta-3">
                Ninguna ciudad de la lista coincide con «{busqueda}».
              </p>
            ) : null}
          </>
        )}
        {!ciudad && !agregando ? (
          <p className="text-[12.5px] text-tinta-3">
            ¿No aparece?{" "}
            {agregaCiudades ? (
              <button
                type="button"
                onClick={() => setAgregando(true)}
                className="cursor-pointer font-semibold text-azul-oscuro hover:underline"
              >
                Agregar ciudad a la lista
              </button>
            ) : (
              "Solo el dueño agrega ciudades a la lista; la lista la comparten todos los catálogos."
            )}
          </p>
        ) : null}
      </div>
      {agregando ? (
        <AgregarCiudad
          nombreInicial={busqueda}
          alCancelar={() => setAgregando(false)}
          alAgregar={(c) => {
            setCiudades((l) => [...l, c]);
            setCiudadId(c.id);
            setAgregando(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Solo el dueño: agrega la ciudad a la lista que comparten todos los catálogos. */
function AgregarCiudad({
  nombreInicial,
  alCancelar,
  alAgregar,
}: {
  nombreInicial: string;
  alCancelar: () => void;
  alAgregar: (c: OpcionCiudad) => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [region, setRegion] = useState("");
  const [pais, setPais] = useState("México");
  const [estado, setEstado] = useState<ResultadoCiudad>(undefined);
  const [pendiente, setPendiente] = useState(false);

  const enviar = async (confirmar: boolean) => {
    const f = new FormData();
    f.set("nombre", nombre);
    f.set("region", region);
    f.set("pais", pais);
    if (confirmar) f.set("confirmar", "si");
    setPendiente(true);
    const r = await agregarCiudad(undefined, f);
    setPendiente(false);
    setEstado(r);
    if (r && "id" in r)
      alAgregar({
        id: r.id,
        nombre: nombre.trim(),
        detalle: `${region.trim()}, ${pais.trim()}`,
        busqueda: normalizar(`${nombre} ${region} ${pais}`),
      });
  };

  return (
    <div role="group" aria-label="Agregar ciudad" className="rounded-[14px] bg-suave p-3.5">
      <p className="mb-2.5 text-[13px] font-semibold">
        Ciudad nueva · queda en la lista para todos los catálogos
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        <Campo
          etiqueta="Ciudad"
          id="ciudad-nueva"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Campo
          etiqueta="Estado o región"
          id="ciudad-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
        <Campo etiqueta="País" id="ciudad-pais" value={pais} onChange={(e) => setPais(e.target.value)} />
      </div>
      {estado && "parecidas" in estado ? (
        <p role="alert" className="mt-2.5 text-[13px] text-ambar">
          Ya hay ciudades con nombre parecido:{" "}
          {estado.parecidas.map((p) => `${p.nombre}, ${p.region}`).join(" · ")}.
        </p>
      ) : null}
      {estado && "error" in estado ? (
        <p role="alert" className="mt-2.5 text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton
          variante="secundario"
          disabled={pendiente}
          onClick={() => enviar(!!(estado && "parecidas" in estado))}
          className="bg-azul text-white shadow-none hover:bg-azul-oscuro"
        >
          {estado && "parecidas" in estado ? "Agregar de todos modos" : "Agregar ciudad"}
        </Boton>
      </div>
    </div>
  );
}
