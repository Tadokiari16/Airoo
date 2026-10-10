"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { IconoAtras, IconoPalomita } from "@/components/iconos";
import { agregarCiudad, type ResultadoCiudad } from "../configuracion/ciudades/acciones";
import type { OpcionCiudad } from "./datos";
import { crearHotel, type ResultadoAlta } from "./acciones";

type Paso = "como" | "manual";

/** Alta de hotel: primero cómo (captura manual o importar), luego nombre y ciudad. */
export function NuevoHotel({
  abierto,
  alCerrar,
  ciudades,
  agregaCiudades,
}: {
  abierto: boolean;
  alCerrar: () => void;
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
}) {
  const [paso, setPaso] = useState<Paso>("como");
  const [forma, setForma] = useState<"manual" | null>(null);
  const cerrar = () => {
    setPaso("como");
    setForma(null);
    alCerrar();
  };
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={cerrar}
      titulo={paso === "manual" ? "Nuevo hotel · captura manual" : "Nuevo hotel"}
      sub={paso === "manual" ? "Nombre y ciudad; lo demás va en la ficha." : "¿Cómo lo quieres dar de alta?"}
      ancho={560}
    >
      {paso === "como" ? (
        <>
          <div className="flex flex-col gap-2.5">
            <Forma
              elegida={forma === "manual"}
              alElegir={() => setForma("manual")}
              titulo="Captura manual"
              texto="Se empieza con nombre y ciudad; lo demás se completa en la ficha. Sirve para cualquier hotel, también los de trato directo."
            />
            <Forma
              deshabilitada
              titulo="Importar desde un proveedor"
              texto="Con el ID que tiene el hotel en el proveedor se traen nombre, fotos, horarios y habitaciones."
            >
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["RateHawk", "TBO Holidays"].map((p) => (
                  <span
                    key={p}
                    className="inline-flex h-6 items-center gap-1.5 rounded-md bg-suave px-2 text-[12px] font-semibold text-tinta-2"
                  >
                    {p} <span className="font-medium text-tinta-3">· Sin conexión</span>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-tinta-3">
                Ningún proveedor está conectado todavía. La importación queda como conexión opcional para más
                adelante.
              </p>
            </Forma>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Boton variante="secundario" onClick={cerrar}>
              Cancelar
            </Boton>
            <Boton disabled={!forma} onClick={() => setPaso("manual")}>
              Continuar
            </Boton>
          </div>
        </>
      ) : (
        <CapturaManual
          ciudades={ciudades}
          agregaCiudades={agregaCiudades}
          alRegresar={() => setPaso("como")}
          alCancelar={cerrar}
        />
      )}
    </Dialogo>
  );
}

function Forma({
  titulo,
  texto,
  elegida,
  alElegir,
  deshabilitada,
  children,
}: {
  titulo: string;
  texto: string;
  elegida?: boolean;
  alElegir?: () => void;
  deshabilitada?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!elegida}
      aria-disabled={deshabilitada}
      onClick={deshabilitada ? undefined : alElegir}
      className={`flex gap-3 rounded-[14px] p-3.5 text-left ${deshabilitada ? "cursor-not-allowed bg-suave/60 shadow-borde" : "cursor-pointer"} ${elegida ? "bg-azul-tenue shadow-[inset_0_0_0_1.5px_var(--color-azul)]" : deshabilitada ? "" : "shadow-borde hover:bg-suave"}`}
    >
      <span
        className={`mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-full ${elegida ? "bg-azul text-white" : "shadow-[inset_0_0_0_1.5px_var(--color-linea)]"}`}
      >
        {elegida ? <IconoPalomita tam={12} strokeWidth={3} /> : null}
      </span>
      <span className={deshabilitada ? "opacity-70" : ""}>
        <b className="block text-[14.5px] font-semibold">{titulo}</b>
        <span className="text-[13px] text-tinta-2">{texto}</span>
        {children}
      </span>
    </button>
  );
}

function CapturaManual({
  ciudades: iniciales,
  agregaCiudades,
  alRegresar,
  alCancelar,
}: {
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
  alRegresar: () => void;
  alCancelar: () => void;
}) {
  const router = useRouter();
  const [ciudades, setCiudades] = useState(iniciales);
  const [nombre, setNombre] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [ciudadId, setCiudadId] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [estado, accion, pendiente] = useActionState(async (prev: ResultadoAlta, f: FormData) => {
    const r = await crearHotel(prev, f);
    if (r && "id" in r) router.push(`/hoteles/${r.id}?nuevo=1`);
    return r;
  }, undefined);

  const ciudad = ciudades.find((c) => c.id === ciudadId);
  const coinciden = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return [];
    return ciudades.filter((c) => c.busqueda.includes(q)).slice(0, 5);
  }, [ciudades, busqueda]);

  return (
    <form onSubmit={enviarSinVaciar(accion)} className="flex flex-col gap-4">
      <input type="hidden" name="ciudadId" value={ciudadId} />
      <Campo
        etiqueta="Nombre"
        name="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. Casa Mexicana San Cristóbal"
        autoFocus
        autoComplete="off"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="buscar-ciudad" className="text-[13px] font-semibold">
          Ciudad
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
              id="buscar-ciudad"
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

      <p className="text-[13px] text-tinta-2">
        Al crearlo se abre su ficha: portada, galería, habitaciones, dirección, Tripadvisor y dónde se puede
        reservar. Nada de eso es obligatorio para empezar a cotizarlo; la ficha marca lo que falta.
      </p>

      {estado && "parecidos" in estado ? (
        <div role="alert" className="rounded-xl bg-ambar-tenue px-3.5 py-3 text-[13.5px]">
          <p className="font-semibold">
            Ya hay {estado.parecidos.length === 1 ? "un hotel" : "hoteles"} con nombre parecido:
          </p>
          <ul className="mt-1 list-disc pl-5 text-tinta-2">
            {estado.parecidos.map((p) => (
              <li key={p.id}>
                <a href={`/hoteles/${p.id}`} className="font-semibold text-azul-oscuro hover:underline">
                  {p.nombre}
                </a>{" "}
                · {p.ciudad}
                {p.archivado ? " · archivado" : ""}
              </li>
            ))}
          </ul>
          <input type="hidden" name="confirmar" value="si" />
        </div>
      ) : null}
      {estado && "error" in estado ? (
        <p role="alert" className="text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Boton variante="texto" onClick={alRegresar} className="gap-1">
          <IconoAtras tam={15} /> Cambiar forma de alta
        </Boton>
        <Boton variante="secundario" className="ml-auto h-10" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" disabled={pendiente || !nombre.trim() || !ciudadId}>
          {estado && "parecidos" in estado ? "Crear de todos modos" : "Crear y abrir ficha"}
        </Boton>
      </div>
    </form>
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
