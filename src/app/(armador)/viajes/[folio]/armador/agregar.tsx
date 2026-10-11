"use client";

import { useEffect, useState } from "react";
import type { ResultadoCatalogo } from "@/lib/armador-fichas";
import type { TipoPartida } from "@/lib/cotizacion";
import { TIPOS_ALTA as TIPOS_SERVICIO } from "@/lib/servicios";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Campo, Selector } from "@/components/ui/campo";
import { ElegirCiudad, type OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import { IconoBuscar, IconoMas, IconoOjo } from "@/components/iconos";
import { COMPARTIDO } from "@/lib/traslados";
import { agregarPartida, altaMinima, buscarCatalogo, unidadPropuesta, type Agregado } from "./acciones";

const TIPOS: { valor: TipoPartida; etiqueta: string; tecla: string; placeholder: string; nuevo: string }[] = [
  { valor: "hotel", etiqueta: "Hotel", tecla: "H", placeholder: "Nombre del hotel o zona", nuevo: "hotel" },
  { valor: "vuelo", etiqueta: "Vuelo", tecla: "V", placeholder: "Aerolínea o código, como VB", nuevo: "aerolínea" },
  { valor: "actividad", etiqueta: "Actividad", tecla: "A", placeholder: "Parque, tour o experiencia", nuevo: "actividad" },
  { valor: "traslado", etiqueta: "Traslado", tecla: "T", placeholder: "Tipo de unidad: sedán, van, Sprinter…", nuevo: "traslado" },
  { valor: "servicio", etiqueta: "Servicio", tecla: "S", placeholder: "Seguro, conectividad, renta de equipo…", nuevo: "servicio" },
];

export type Colocacion = "estancia" | "opcion";

export function AgregarServicio({
  abierto,
  tipoInicial,
  colocacionInicial,
  colocaciones,
  alCerrar,
  alAgregar,
  cotizacionId,
  ciudadId,
  destino,
  cliente,
  ciudades,
  agregaCiudades,
  editaCatalogo,
  personas,
}: {
  abierto: boolean;
  tipoInicial: TipoPartida;
  colocacionInicial: Colocacion;
  /** Dónde puede ir un hotel nuevo: como otra opción, como otra estancia o ambas. */
  colocaciones: Colocacion[];
  alCerrar: () => void;
  alAgregar: (a: Agregado) => void;
  cotizacionId: string;
  ciudadId: string;
  destino: string;
  cliente: string;
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
  editaCatalogo: boolean;
  /** Personas del viaje: con ellas se propone la unidad del traslado. */
  personas: number;
}) {
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Agregar servicio"
      sub="Fechas y personas salen del viaje. Lo que no está en tu catálogo se da de alta aquí con lo mínimo y se completa después en su ficha."
      ancho={820}
    >
      <Contenido
        tipoInicial={tipoInicial}
        colocacionInicial={colocacionInicial}
        colocaciones={colocaciones}
        alCerrar={alCerrar}
        alAgregar={alAgregar}
        cotizacionId={cotizacionId}
        ciudadId={ciudadId}
        destino={destino}
        cliente={cliente}
        ciudades={ciudades}
        agregaCiudades={agregaCiudades}
        editaCatalogo={editaCatalogo}
        personas={personas}
      />
    </Dialogo>
  );
}

function Contenido({
  tipoInicial,
  colocacionInicial,
  colocaciones,
  alCerrar,
  alAgregar,
  cotizacionId,
  ciudadId,
  destino,
  cliente,
  ciudades,
  agregaCiudades,
  editaCatalogo,
  personas,
}: Omit<Parameters<typeof AgregarServicio>[0], "abierto">) {
  const [tipo, setTipo] = useState<TipoPartida>(tipoInicial);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ResultadoCatalogo[] | null>(null);
  const [elegido, setElegido] = useState<ResultadoCatalogo | null>(null);
  const [alta, setAlta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState(ciudadId);
  const [iata, setIata] = useState("");
  const [tipoServicio, setTipoServicio] = useState<string>(TIPOS_SERVICIO[0].valor);
  const [colocacion, setColocacion] = useState<Colocacion>(colocacionInicial);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const def = TIPOS.find((t) => t.valor === tipo)!;

  useEffect(() => {
    let vigente = true;
    const t = setTimeout(async () => {
      const r = await buscarCatalogo(tipo, q, ciudadId);
      if (!vigente) return;
      if (tipo === "traslado") {
        // El compartido no lleva unidad; la propuesta es la unidad más chica en la que cabe el viaje.
        setResultados([
          ...r,
          { id: COMPARTIDO, nombre: "Traslado compartido", sub: "Sin unidad: el viaje va con otros pasajeros", ciudadId: null, usos: 0 },
        ]);
        if (!q.trim()) {
          const id = await unidadPropuesta(personas);
          if (vigente) setElegido((e) => e ?? r.find((x) => x.id === id) ?? null);
        }
        return;
      }
      setResultados(r);
    }, 160);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [tipo, q, ciudadId, personas]);

  // H, V, A, S cambian de tipo cuando no se está escribiendo.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      const nuevo = TIPOS.find((x) => x.tecla.toLowerCase() === e.key.toLowerCase());
      if (nuevo) cambiarTipo(nuevo.valor);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  function cambiarTipo(t: TipoPartida) {
    setTipo(t);
    setElegido(null);
    setAlta(false);
    setError(null);
    setResultados(null);
  }

  async function agregar() {
    setError(null);
    setEnviando(true);
    try {
      let id = elegido?.id;
      if (alta) {
        const r = await altaMinima(
          tipo === "vuelo"
            ? { tipo, nombre, iata }
            : tipo === "servicio"
              ? { tipo, nombre, tipoServicio }
              : { tipo, nombre, ciudadId: ciudad },
        );
        if ("error" in r) return setError(r.error);
        id = r.id;
      }
      if (!id) return;
      const r = await agregarPartida(cotizacionId, tipo, id, colocacion);
      if ("error" in r) return setError(r.error);
      alAgregar(r);
    } finally {
      setEnviando(false);
    }
  }

  const listo = alta ? nombre.trim().length >= 2 && (tipo !== "vuelo" || iata.trim().length === 2) : !!elegido;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Tipo de servicio" className="flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            role="tab"
            aria-selected={t.valor === tipo}
            onClick={() => cambiarTipo(t.valor)}
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] px-3.5 text-[13.5px] font-semibold ${t.valor === tipo ? "bg-tinta text-white" : "bg-suave text-tinta-2 hover:text-tinta"}`}
          >
            {t.etiqueta}
            <kbd className={`text-[11px] font-bold ${t.valor === tipo ? "text-white/60" : "text-tinta-3"}`}>{t.tecla}</kbd>
          </button>
        ))}
      </div>

      {alta ? (
        <div className="flex flex-col gap-3 rounded-[14px] bg-suave p-4">
          <div>
            <p className="text-[14px] font-bold">
              {tipo === "hotel" ? "Hotel nuevo" : tipo === "actividad" ? "Actividad nueva" : tipo === "vuelo" ? "Aerolínea nueva" : "Servicio nuevo"} con lo mínimo
            </p>
            <p className="text-[12.5px] text-tinta-2">
              {tipo === "vuelo"
                ? "Nombre y código para cotizar hoy. Tarifas y check-in, en su ficha."
                : tipo === "servicio"
                  ? "Nombre y tipo para cotizar hoy. Unidades o planes y proveedores, en su ficha."
                  : "Nombre y ciudad para cotizar hoy. Habitaciones, plataforma y precio se capturan en el armador; fotos y lo demás, en su ficha."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
            {tipo === "vuelo" ? (
              <Campo
                etiqueta="Código de la aerolínea"
                name="iata"
                value={iata}
                maxLength={2}
                placeholder="VB"
                onChange={(e) => setIata(e.target.value.toUpperCase())}
              />
            ) : tipo === "servicio" ? (
              <Selector etiqueta="Tipo" name="tipoServicio" value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)}>
                {TIPOS_SERVICIO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.nombre}
                  </option>
                ))}
              </Selector>
            ) : (
              <div>
                <ElegirCiudad ciudades={ciudades} agregaCiudades={agregaCiudades} valor={ciudad} alCambiar={setCiudad} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAlta(false)}
            className="cursor-pointer self-start text-[13px] font-semibold text-azul-oscuro hover:underline"
          >
            Regresar a la búsqueda
          </button>
        </div>
      ) : (
        <>
          <label className="flex h-12 items-center gap-2.5 rounded-campo bg-tarjeta px-3.5 shadow-[inset_0_0_0_1.5px_var(--color-azul)]">
            <IconoBuscar tam={17} />
            <input
              aria-label="Buscar en el catálogo"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setElegido(null);
              }}
              placeholder={def.placeholder}
              autoFocus
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-tinta-3"
            />
            {tipo === "hotel" ? <span className="text-[12.5px] text-tinta-3">{destino}</span> : null}
          </label>

          <div>
            <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
              {q.trim() ? "En tu catálogo" : tipo === "hotel" ? `En tu catálogo · ${destino}` : "Lo más usado"}
            </p>
            {resultados === null ? (
              <p className="rounded-campo px-3.5 py-3 text-[13px] text-tinta-3 shadow-borde">Buscando…</p>
            ) : resultados.length ? (
              <ul role="listbox" aria-label="Resultados del catálogo" className="max-h-[260px] overflow-auto rounded-campo shadow-borde">
                {resultados.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={elegido?.id === r.id}
                      onClick={() => setElegido(r)}
                      className={`flex w-full cursor-pointer items-center gap-3 border-t border-linea px-3.5 py-2.5 text-left first:border-t-0 ${elegido?.id === r.id ? "bg-azul-tenue" : "hover:bg-suave"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[14px] font-semibold">{r.nombre}</b>
                        <span className="block truncate text-[12.5px] text-tinta-3">
                          {r.sub}
                          {r.usos ? ` · lo has cotizado ${r.usos} ${r.usos === 1 ? "vez" : "veces"}` : ""}
                        </span>
                      </span>
                      {elegido?.id === r.id ? <span className="text-[12px] font-bold text-azul-oscuro">Elegido</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-campo px-3.5 py-3 text-[13px] text-tinta-2 shadow-borde">
                {q.trim() ? `Nada en tu catálogo con «${q.trim()}».` : "Todavía no hay nada en este catálogo."}
              </p>
            )}
          </div>

          {tipo === "traslado" ? (
            <p className="text-[12.5px] text-tinta-3">
              Los tipos de unidad se dan de alta en Catálogos › Traslados. La ruta, la fecha y la hora se ajustan en
              el armador.
            </p>
          ) : editaCatalogo ? (
            <div>
              <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.06em] text-tinta-3 uppercase">¿No aparece?</p>
              <button
                type="button"
                onClick={() => {
                  setNombre(q.trim());
                  setAlta(true);
                  setElegido(null);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-campo px-3.5 py-2.5 text-left hover:bg-suave"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-azul-tenue text-azul-oscuro">
                  <IconoMas tam={16} />
                </span>
                <span className="flex-1">
                  <b className="block text-[14px] font-semibold">
                    {q.trim() ? `Dar de alta «${q.trim()}»` : `Dar de alta un ${def.nuevo === "actividad" ? "actividad" : def.nuevo}`.replace("un actividad", "una actividad").replace("un aerolínea", "una aerolínea")}
                  </b>
                  <span className="block text-[12.5px] text-tinta-3">
                    Con nombre y {tipo === "vuelo" ? "código" : tipo === "servicio" ? "tipo" : "ciudad"} basta para cotizar hoy; lo demás, en su ficha.
                  </span>
                </span>
                <span className="rounded-md bg-suave px-2 py-0.5 text-[11.5px] font-bold text-tinta-2">Nuevo</span>
              </button>
            </div>
          ) : null}
        </>
      )}

      {tipo === "hotel" && colocaciones.length ? (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Este hotel va</p>
          <div className="flex flex-col gap-1.5 text-[13.5px]">
            {colocaciones.includes("opcion") ? (
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="colocacion"
                  checked={colocacion === "opcion"}
                  onChange={() => setColocacion("opcion")}
                  className="mt-1 accent-[var(--color-azul)]"
                />
                <span>
                  <b className="font-semibold">Como otra opción</b>
                  <span className="block text-[12.5px] text-tinta-3">Mismas fechas; {cliente} compara y elige uno.</span>
                </span>
              </label>
            ) : null}
            {colocaciones.includes("estancia") ? (
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="colocacion"
                  checked={colocacion === "estancia"}
                  onChange={() => setColocacion("estancia")}
                  className="mt-1 accent-[var(--color-azul)]"
                />
                <span>
                  <b className="font-semibold">Como otra estancia</b>
                  <span className="block text-[12.5px] text-tinta-3">Otras noches del viaje, en otro hotel o ciudad.</span>
                </span>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] font-semibold text-rojo">
          {error}
        </p>
      ) : null}

      <div className="-mx-6 mt-1 flex items-center justify-between gap-3 border-t border-linea px-6 pt-4">
        <span className="flex items-center gap-1.5 text-[12.5px] text-tinta-3">
          <IconoOjo tam={14} /> {cliente} lo verá en su enlace cuando envíes la cotización
        </span>
        <div className="flex gap-2">
          <Boton variante="secundario" className="h-10" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton disabled={!listo || enviando} onClick={agregar}>
            {enviando ? "Agregando…" : "Agregar al viaje"}
          </Boton>
        </div>
      </div>
    </div>
  );
}
