"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aCalculo,
  calcular,
  vistasDeOpcion,
  type FixCotizacion,
  type Opcion,
  type PartidaArmador,
} from "@/lib/armador";
import { revisarCotizacion, type ContextoRevision, type Hallazgo } from "@/lib/revision";
import type { Aeropuerto } from "@/lib/vuelos";
import { idCatalogo, type FichaArmador } from "@/lib/armador-fichas";
import { lineasPartida, nombreCorto, nombrePartida, SECCIONES, type ClaveSeccion } from "@/lib/armador-textos";
import { bebesDe, partidasDeOpcion, pasajerosConPrecio, planDePagos, totales, vigencia, type TipoPartida } from "@/lib/cotizacion";
import { formatoDinero } from "@/lib/dinero";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import {
  IconoActividades,
  IconoAerolineas,
  IconoAtras,
  IconoBasura,
  IconoEtiqueta,
  IconoHoteles,
  IconoMas,
  IconoServicios,
  IconoTraslados,
} from "@/components/iconos";
import { hotelesDelViaje } from "@/lib/traslados";
import {
  acuerdoPropuesto,
  eliminarPartida,
  guardarAjustes,
  guardarNota,
  guardarPartida,
  marcarRecomendada,
  type Agregado,
} from "./acciones";
import type { DatosArmador, ProveedorOpcion } from "./datos";
import { AgregarServicio, type Colocacion } from "./agregar";
import { EditorActividad, EditorHotel, EditorServicio, EditorVuelo } from "./editores";
import { EditorTraslado } from "./traslado";
import { PanelPrecio } from "./precio";
import { AjustesCotizacion, AntesDeEnviar, Hallazgos, TotalPorOpcion, type VistaOpcion } from "./totales";

const ESPERA_GUARDADO = 700;

const AGREGAR: Record<ClaveSeccion, { tipo: TipoPartida; texto: string }[]> = {
  hospedaje: [{ tipo: "hotel", texto: "Agregar hotel" }],
  vuelos: [{ tipo: "vuelo", texto: "Agregar vuelo" }],
  actividades: [{ tipo: "actividad", texto: "Agregar actividad o excursión" }],
  servicios: [
    { tipo: "traslado", texto: "Agregar traslado" },
    { tipo: "servicio", texto: "Agregar servicio" },
  ],
};

const ICONO: Record<TipoPartida, (p: { tam?: number }) => React.ReactNode> = {
  hotel: IconoHoteles,
  vuelo: IconoAerolineas,
  actividad: IconoActividades,
  traslado: IconoTraslados,
  servicio: IconoServicios,
};

/** Categorías de Proveedores que sirven para cada tipo de servicio. */
const CATEGORIAS: Record<TipoPartida, string[]> = {
  hotel: ["Hoteles"],
  vuelo: [],
  actividad: ["Tours y parques"],
  traslado: ["Traslados"],
  servicio: ["Seguros", "Otro"],
};

const proveedoresPara = (tipo: TipoPartida, todos: ProveedorOpcion[]) =>
  todos.filter((x) =>
    tipo === "vuelo"
      ? x.tipo === "plataforma"
      : x.categorias.length === 0 || x.categorias.some((c) => CATEGORIAS[tipo].includes(c)),
  );

type EstadoGuardado = { pendientes: number; error: string | null; alguno: boolean };

export function Armador({ datos }: { datos: DatosArmador }) {
  const { viaje, reglas } = datos;
  const cotizacionId = datos.cotizacion.id;
  const personas = viaje.adultos + viaje.menores;
  const bebes = bebesDe(viaje.edadesMenores, viaje.menores);
  const pagan = pasajerosConPrecio(viaje.adultos, viaje.menores, viaje.edadesMenores);

  const [partidas, setPartidas] = useState(datos.partidas);
  const [opciones, setOpciones] = useState(datos.opciones);
  const [fichas, setFichas] = useState(datos.fichas);
  const [fx, setFx] = useState<FixCotizacion>(datos.fx);
  const [ajustes, setAjustes] = useState({
    validaHasta: datos.cotizacion.validaHasta,
    utilidadBasePb: datos.cotizacion.utilidadBasePb,
    conIva: datos.cotizacion.conIva,
  });
  const [opcionVista, setOpcionVista] = useState<string | null>(
    datos.opciones.find((o) => o.recomendada)?.id ?? vistasDeOpcion(datos.opciones)[0],
  );
  const [agregar, setAgregar] = useState<{ tipo: TipoPartida; colocacion: Colocacion } | null>(null);
  const [quitar, setQuitar] = useState<PartidaArmador | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<EstadoGuardado>({ pendientes: 0, error: null, alguno: false });
  const [resaltada, setResaltada] = useState<string | null>(null);
  const [aeropuertos, setAeropuertos] = useState<Record<string, Aeropuerto>>(datos.aeropuertos);

  // ─── Guardado automático, una partida a la vez ────────────────────────────
  const ultimas = useRef(new Map<string, PartidaArmador>());
  const relojes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const guardarYa = useCallback(
    async (id: string) => {
      relojes.current.delete(id);
      const p = ultimas.current.get(id);
      if (!p) return;
      ultimas.current.delete(id);
      const r = await guardarPartida(cotizacionId, p);
      setGuardado((g) => ({
        pendientes: Math.max(0, g.pendientes - 1),
        error: "error" in r ? r.error : g.pendientes > 1 ? g.error : null,
        alguno: true,
      }));
      if (!("error" in r) && r.fx) setFx({ fixUsd: r.fx.fixUsd, fixEur: r.fx.fixEur, colchonPb: r.fx.colchonPb });
    },
    [cotizacionId],
  );

  const programar = useCallback(
    (p: PartidaArmador) => {
      const yaEsperaba = relojes.current.has(p.id);
      if (yaEsperaba) clearTimeout(relojes.current.get(p.id));
      else setGuardado((g) => ({ ...g, pendientes: g.pendientes + 1 }));
      ultimas.current.set(p.id, p);
      relojes.current.set(
        p.id,
        setTimeout(() => void guardarYa(p.id), ESPERA_GUARDADO),
      );
    },
    [guardarYa],
  );

  useEffect(() => {
    const antes = (e: BeforeUnloadEvent) => {
      if (relojes.current.size || ultimas.current.size) e.preventDefault();
    };
    window.addEventListener("beforeunload", antes);
    return () => window.removeEventListener("beforeunload", antes);
  }, []);

  const cambiar = useCallback(
    (id: string, cambio: Partial<PartidaArmador>) => {
      setPartidas((todas) =>
        todas.map((p) => {
          if (p.id !== id) return p;
          const nueva = { ...p, ...cambio, detalle: { ...p.detalle, ...(cambio.detalle ?? {}) } };
          // Los errores no impiden la captura: se guardan y solo impiden enviar la cotización.
          programar(nueva);
          return nueva;
        }),
      );
    },
    [programar],
  );

  const elegirProveedor = async (p: PartidaArmador, proveedorId: string | null) => {
    cambiar(p.id, { proveedorId });
    if (!proveedorId) return;
    const a = await acuerdoPropuesto(proveedorId);
    if (a)
      cambiar(p.id, {
        pagoProveedor: a.pagoProveedor,
        anticipoProveedorPb: a.anticipoProveedorPb,
        cancelacionTexto: p.cancelacionTexto ?? a.cancelacionTexto,
      });
  };

  // ─── Cálculos ─────────────────────────────────────────────────────────────
  const fichaDe = useCallback((p: PartidaArmador) => {
    const id = idCatalogo(p);
    return id ? fichas[id] : undefined;
  }, [fichas]);

  const nombres = useMemo(
    () => Object.fromEntries(partidas.map((p) => [p.id, nombreCorto(p, fichaDe(p))])),
    [partidas, fichaDe],
  );

  const ctx: ContextoRevision = useMemo(
    () => ({
      viaje: {
        inicio: viaje.inicio,
        fin: viaje.fin,
        adultos: viaje.adultos,
        menores: viaje.menores,
        edadesMenores: viaje.edadesMenores,
      },
      hoy: reglas.hoy,
      fx,
      aeropuertos,
      aerolineas: datos.aerolineas,
      nombres,
      tramos: Object.fromEntries(partidas.filter((p) => p.tipo === "vuelo").flatMap((p) => p.tramos.map((t) => [t.id, t]))),
      unidades: Object.fromEntries(datos.unidades.map((u) => [u.id, u])),
    }),
    [viaje, reglas.hoy, fx, aeropuertos, datos.aerolineas, nombres, partidas, datos.unidades],
  );
  const hallazgos = useMemo(() => revisarCotizacion(partidas, ctx), [partidas, ctx]);
  const bloquean = hallazgos.filter((h) => h.nivel === "error" || h.nivel === "falta");
  const deLaPartida = (id: string) => hallazgos.filter((h) => h.partidaId === id && h.nivel !== "falta");

  const ajustesTotales = {
    cargoServicio: datos.cotizacion.cargoServicio,
    conIva: ajustes.conIva,
    ivaPb: datos.cotizacion.ivaPb,
    personas: pagan,
    bebes,
  };

  const vistas: VistaOpcion[] = vistasDeOpcion(opciones).map((id) => {
    const deOpcion = partidasDeOpcion(partidas, id);
    const calculos = deOpcion.map((p) => aCalculo(p, fx));
    const hotel = id ? partidas.find((p) => p.opcionId === id) : undefined;
    const sinNeto = [...(hotel ? [hotel] : []), ...deOpcion].find((p) => calcular(p, fx).precio === null);
    return {
      id,
      nombre: hotel ? nombreCorto(hotel, fichaDe(hotel)) : "Total",
      totales: totales(calculos, ajustesTotales),
      plan: planDePagos(calculos, {
        ...ajustesTotales,
        inicio: viaje.inicio,
        hoy: reglas.hoy,
        diasAntesViaje: reglas.diasAntesViaje,
      }),
      falta: sinNeto ? `${nombres[sinNeto.id]} todavía no tiene costo neto` : null,
    };
  });

  const maxima = vigencia(
    reglas.hoy,
    reglas.vigenciaDias,
    partidas.filter((p) => p.tipo === "hotel").map((p) => p.pagarAntes),
  ).maxima;

  // ─── Acciones ─────────────────────────────────────────────────────────────
  const irA = (id: string) => {
    const p = partidas.find((x) => x.id === id);
    if (p?.opcionId) setOpcionVista(p.opcionId);
    setResaltada(id);
    setTimeout(() => document.getElementById(`partida-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => setResaltada(null), 1600);
  };

  const alAgregar = (a: Agregado) => {
    setPartidas(a.partidas);
    setOpciones(a.opciones);
    const ficha = a.ficha;
    if (ficha) setFichas((f) => ({ ...f, [ficha.id]: ficha }));
    setAgregar(null);
    setAviso(`Se agregó ${nombrePartida(a.partida, ficha ?? undefined)}`);
    irA(a.partida.id);
    if (a.partida.opcionId) setOpcionVista(a.partida.opcionId);
  };

  const confirmarQuitar = async () => {
    if (!quitar) return;
    const p = quitar;
    setQuitar(null);
    const reloj = relojes.current.get(p.id);
    if (reloj) {
      clearTimeout(reloj);
      relojes.current.delete(p.id);
      ultimas.current.delete(p.id);
      setGuardado((g) => ({ ...g, pendientes: Math.max(0, g.pendientes - 1) }));
    }
    const r = await eliminarPartida(cotizacionId, p.id);
    if ("error" in r) {
      setAviso(r.error);
      return;
    }
    setPartidas(r.partidas);
    setOpciones(r.opciones);
    if (!r.opciones.some((o) => o.id === opcionVista))
      setOpcionVista(r.opciones.find((o) => o.recomendada)?.id ?? vistasDeOpcion(r.opciones)[0]);
    setAviso(`Se quitó ${nombrePartida(p, fichaDe(p))}`);
  };

  const recomendar = async (opcionId: string) => {
    setOpciones((os) => os.map((o) => ({ ...o, recomendada: o.id === opcionId })));
    const r = await marcarRecomendada(cotizacionId, opcionId);
    if ("error" in r) setAviso(r.error);
    else setOpciones(r);
  };

  const cambiarAjustes = async (c: { validaHasta?: string; utilidadBasePb?: number; conIva?: boolean }) => {
    const nuevos = { ...ajustes, ...c };
    setAjustes(nuevos);
    if (c.utilidadBasePb !== undefined && c.utilidadBasePb !== ajustes.utilidadBasePb)
      setPartidas((todas) =>
        todas.map((p) =>
          p.utilidadManual || p.tipo === "vuelo" ? p : { ...p, utilidadPb: c.utilidadBasePb as number },
        ),
      );
    if (!nuevos.validaHasta) return;
    setGuardado((g) => ({ ...g, pendientes: g.pendientes + 1 }));
    const r = await guardarAjustes(cotizacionId, { ...nuevos, validaHasta: nuevos.validaHasta });
    setGuardado((g) => ({ pendientes: Math.max(0, g.pendientes - 1), error: r.error ?? null, alguno: true }));
  };

  // ─── Lo que se ve ─────────────────────────────────────────────────────────
  const hoteles = partidas.filter((p) => p.tipo === "hotel");
  const estancias = hoteles.filter((p) => !p.opcionId);
  const colocaciones: Colocacion[] = opciones.length
    ? ["opcion"]
    : estancias.length === 1
      ? ["opcion", "estancia"]
      : ["estancia"];
  const tramosVuelo = partidas.filter((p) => p.tipo === "vuelo").flatMap((p) => p.tramos);
  const hotelesTraslado = hotelesDelViaje(
    hoteles.map((h) => ({ opcionId: h.opcionId, fechaInicio: h.fechaInicio, nombre: fichaDe(h)?.nombre ?? "Hotel" })),
  );
  const ordenadas = [...opciones].sort((a, b) => a.orden - b.orden);

  const tarjeta = (p: PartidaArmador) => (
    <TarjetaPartida
      key={p.id}
      p={p}
      ficha={fichaDe(p)}
      datos={datos}
      fx={fx}
      utilidadBasePb={ajustes.utilidadBasePb}
      partidas={partidas}
      tramosVuelo={tramosVuelo}
      hotelesTraslado={hotelesTraslado}
      hallazgos={deLaPartida(p.id)}
      aeropuertos={aeropuertos}
      alConocerAeropuertos={(lista) =>
        setAeropuertos((a) => ({ ...a, ...Object.fromEntries(lista.map((x) => [x.iata, x])) }))
      }
      resaltada={resaltada === p.id}
      opcion={p.opcionId ? opciones.find((o) => o.id === p.opcionId) : undefined}
      alCambiar={(c) => cambiar(p.id, c)}
      alElegirProveedor={(id) => void elegirProveedor(p, id)}
      alAvisar={setAviso}
      alAgregarHabitacion={(h) =>
        setFichas((f) => {
          const id = p.hotelId;
          const actual = id ? f[id] : undefined;
          if (!id || actual?.tipo !== "hotel") return f;
          return { ...f, [id]: { ...actual, habitaciones: [...actual.habitaciones, h] } };
        })
      }
      alQuitar={() => setQuitar(p)}
      alRecomendar={p.opcionId ? () => void recomendar(p.opcionId as string) : undefined}
    />
  );

  const textoGuardado = guardado.error
    ? guardado.error
    : guardado.pendientes > 0
      ? "Guardando…"
      : guardado.alguno
        ? "Guardado"
        : "Sin cambios";

  return (
    <div className="min-h-dvh bg-fondo">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-linea bg-tarjeta px-5 py-2.5">
        <Link
          href={`/viajes/${viaje.folio}`}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
        >
          <IconoAtras tam={14} /> {viaje.folioTexto}
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-bold">{viaje.cliente}</h1>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-tinta-3">
              <span className="size-1.5 rounded-full bg-tinta-3" aria-hidden />
              {datos.cotizacion.estado === "borrador" ? "Borrador" : "Enviada"}
              {datos.cotizacion.version > 1 ? ` · versión ${datos.cotizacion.version}` : ""}
            </span>
          </div>
          <p className="text-[12px] text-tinta-3">{viaje.resumen}</p>
        </div>
        <span
          aria-live="polite"
          className={`ml-auto text-[12.5px] ${guardado.error ? "font-semibold text-rojo" : "text-tinta-3"}`}
        >
          {textoGuardado}
        </span>
        <button
          type="button"
          disabled
          title="Revisar y enviar llega en la siguiente entrega"
          className="inline-flex h-[34px] cursor-not-allowed items-center gap-2 rounded-[10px] bg-azul/45 px-3.5 text-[13px] font-semibold text-white"
        >
          Revisar y enviar
          {bloquean.length ? (
            <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1.5 text-[11.5px] font-bold text-azul-oscuro">
              {bloquean.length}
            </span>
          ) : null}
        </button>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_340px] items-start gap-5 px-5 py-5">
        <div className="flex min-w-0 flex-col gap-5">
          {SECCIONES.map((s) => {
            const tipos: readonly TipoPartida[] = s.tipos;
            const deSeccion = partidas.filter((p) => tipos.includes(p.tipo)).sort((a, b) => a.orden - b.orden);
            const hayVuelo = s.clave === "vuelos" && deSeccion.length > 0;
            const esHospedaje = s.clave === "hospedaje";
            const hotelVisto =
              esHospedaje && opciones.length ? partidas.find((p) => p.opcionId === opcionVista) : undefined;
            return (
              <section
                key={s.clave}
                aria-label={s.titulo}
                className="rounded-tarjeta bg-tarjeta shadow-tarjeta"
              >
                <div className="flex items-center justify-between border-b border-linea px-5 py-3.5">
                  <h2 className="text-[16px] font-bold">{s.titulo}</h2>
                  <div className="flex items-center gap-2">
                    {hayVuelo ? (
                      <span className="text-[12.5px] text-tinta-3">
                        Ya hay un vuelo en esta cotización. Se edita para cambiar el tipo de viaje.
                      </span>
                    ) : null}
                    {AGREGAR[s.clave].map((a) => (
                      <Boton
                        key={a.tipo}
                        variante="secundario"
                        disabled={hayVuelo}
                        onClick={() =>
                          setAgregar({ tipo: a.tipo, colocacion: a.tipo === "hotel" ? colocaciones[0] : "estancia" })
                        }
                        className="disabled:opacity-50"
                      >
                        <IconoMas tam={14} /> {a.texto}
                      </Boton>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-5">
                  {esHospedaje && opciones.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div role="tablist" aria-label="Opciones de hospedaje" className="flex rounded-[12px] bg-suave p-1">
                        {ordenadas.map((o) => {
                          const h = partidas.find((p) => p.opcionId === o.id);
                          const v = vistas.find((x) => x.id === o.id);
                          const on = o.id === opcionVista;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              role="tab"
                              aria-selected={on}
                              onClick={() => setOpcionVista(o.id)}
                              className={`cursor-pointer rounded-[9px] px-3 py-1.5 text-left ${on ? "bg-tarjeta shadow-[0_1px_2px_rgba(17,26,43,.12)]" : "hover:bg-tarjeta/60"}`}
                            >
                              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                                {h ? nombres[h.id] : "Opción"}
                                {o.recomendada ? (
                                  <span className="rounded-full bg-azul-tenue px-1.5 text-[10.5px] font-bold text-azul-oscuro">
                                    Recomendada
                                  </span>
                                ) : null}
                              </span>
                              <span className="num block text-[11.5px] text-tinta-3">
                                {v?.falta
                                  ? "Falta costo neto"
                                  : v
                                    ? `${formatoDinero(v.totales.secciones.hospedaje)} · ${formatoDinero(Math.round(v.totales.secciones.hospedaje / Math.max(1, pagan)))} p/p${bebes ? " sin contar bebés" : ""}`
                                    : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <Boton variante="texto" onClick={() => setAgregar({ tipo: "hotel", colocacion: "opcion" })}>
                        <IconoMas tam={13} /> Otra opción
                      </Boton>
                    </div>
                  ) : null}

                  {esHospedaje && opciones.length ? (
                    hotelVisto ? (
                      tarjeta(hotelVisto)
                    ) : null
                  ) : deSeccion.length ? (
                    deSeccion.map(tarjeta)
                  ) : (
                    <p className="rounded-[12px] border border-dashed border-linea px-4 py-5 text-center text-[13px] text-tinta-3">
                      Sin {s.clave === "hospedaje" ? "hotel" : s.clave === "vuelos" ? "vuelo" : s.clave === "actividades" ? "actividades" : "servicios"} en esta cotización.
                    </p>
                  )}

                  {deSeccion.length ? (
                    <NotaSeccion
                      key={s.clave}
                      inicial={datos.cotizacion.notas[s.clave] ?? ""}
                      alGuardar={async (t) => (await guardarNota(cotizacionId, s.clave, t)).error ?? null}
                    />
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="sticky top-[76px] flex flex-col gap-4">
          <TotalPorOpcion
            vistas={vistas}
            elegida={opcionVista}
            alElegir={(id) => setOpcionVista(id)}
            conIva={ajustes.conIva}
            ivaPb={datos.cotizacion.ivaPb}
          />
          <AntesDeEnviar hallazgos={hallazgos} alIr={(h: Hallazgo) => h.partidaId && irA(h.partidaId)} />
          <AjustesCotizacion
            validaHasta={ajustes.validaHasta}
            maxima={maxima}
            utilidadBasePb={ajustes.utilidadBasePb}
            conIva={ajustes.conIva}
            ivaPb={datos.cotizacion.ivaPb}
            alCambiar={(c) => void cambiarAjustes(c)}
          />
        </aside>
      </div>

      {agregar ? (
        <AgregarServicio
          abierto
          tipoInicial={agregar.tipo}
          colocacionInicial={agregar.colocacion}
          colocaciones={hoteles.length ? colocaciones : ["estancia"]}
          alCerrar={() => setAgregar(null)}
          alAgregar={alAgregar}
          cotizacionId={cotizacionId}
          ciudadId={viaje.ciudadId}
          destino={viaje.destino}
          cliente={viaje.clienteNombre}
          ciudades={datos.ciudades}
          agregaCiudades={datos.agregaCiudades}
          editaCatalogo={datos.editaCatalogo}
          personas={personas}
        />
      ) : null}

      <Dialogo
        abierto={!!quitar}
        alCerrar={() => setQuitar(null)}
        titulo="Quitar de la cotización"
        sub={
          quitar
            ? quitar.opcionId && opciones.length === 2
              ? `${nombrePartida(quitar, fichaDe(quitar))} sale de la cotización. Queda un solo hotel y deja de haber opciones.`
              : `${nombrePartida(quitar, fichaDe(quitar))} sale de la cotización. El catálogo no cambia.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={() => setQuitar(null)}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={() => void confirmarQuitar()}>
            Quitar
          </Boton>
        </div>
      </Dialogo>

      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </div>
  );
}

// ─── Una partida: encabezado, editor y precio ───────────────────────────────

function TarjetaPartida({
  p,
  ficha,
  datos,
  fx,
  utilidadBasePb,
  partidas,
  tramosVuelo,
  hotelesTraslado,
  hallazgos,
  aeropuertos,
  alConocerAeropuertos,
  resaltada,
  opcion,
  alCambiar,
  alElegirProveedor,
  alAvisar,
  alAgregarHabitacion,
  alQuitar,
  alRecomendar,
}: {
  p: PartidaArmador;
  ficha: FichaArmador | undefined;
  datos: DatosArmador;
  fx: FixCotizacion;
  utilidadBasePb: number;
  partidas: PartidaArmador[];
  tramosVuelo: PartidaArmador["tramos"];
  hotelesTraslado: { llegada: string | null; salida: string | null };
  /** Errores y avisos de esta partida; lo que falta se ve en «Antes de enviar». */
  hallazgos: Hallazgo[];
  aeropuertos: Record<string, Aeropuerto>;
  alConocerAeropuertos: (a: Aeropuerto[]) => void;
  resaltada: boolean;
  opcion: Opcion | undefined;
  alCambiar: (c: Partial<PartidaArmador>) => void;
  alElegirProveedor: (id: string | null) => void;
  alAvisar: (t: string) => void;
  alAgregarHabitacion: (h: { id: string; nombre: string }) => void;
  alQuitar: () => void;
  alRecomendar?: () => void;
}) {
  const { viaje, reglas } = datos;
  const calc = calcular(p, fx);
  const Icono = ICONO[p.tipo];
  const foto = ficha && "foto" in ficha ? ficha.foto : null;
  const lineas = lineasPartida(p, ficha);
  const lugar = ficha?.lugar ?? "";
  const porCompletar = ficha && "porCompletar" in ficha && ficha.porCompletar;
  const viajeEditor = { inicio: viaje.inicio, fin: viaje.fin, adultos: viaje.adultos, menores: viaje.menores };

  const ocupadas = Object.fromEntries(
    partidas
      .filter((x) => x.tipo === "actividad" && x.id !== p.id && x.fechaInicio)
      .map((x) => [x.fechaInicio as string, nombrePartida(x)]),
  );

  return (
    <article
      id={`partida-${p.id}`}
      aria-label={nombrePartida(p, ficha)}
      className={`flex flex-col gap-3.5 rounded-[14px] transition-shadow duration-300 ${resaltada ? "shadow-[0_0_0_2px_var(--color-azul)]" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-suave text-tinta-3 shadow-borde">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="" className="size-full object-cover" />
          ) : p.tipo === "vuelo" && ficha?.tipo === "vuelo" ? (
            <span className="text-[13px] font-bold text-azul-oscuro">{ficha.iata}</span>
          ) : (
            <Icono tam={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-[15px] font-bold">
            {nombrePartida(p, ficha)}
            {opcion?.recomendada ? (
              <span className="rounded-full bg-azul-tenue px-2 py-px text-[11px] font-bold text-azul-oscuro">
                Recomendada
              </span>
            ) : null}
            {porCompletar ? (
              <span className="rounded-full bg-ambar-tenue px-2 py-px text-[11px] font-semibold text-ambar">
                Ficha por completar
              </span>
            ) : null}
          </h3>
          <p className="text-[12.5px] text-tinta-3">{[lugar, lineas[0]].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {alRecomendar && !opcion?.recomendada ? (
            <Boton variante="secundario" onClick={alRecomendar}>
              <IconoEtiqueta tam={13} /> Marcar como recomendada
            </Boton>
          ) : null}
          <button
            type="button"
            onClick={alQuitar}
            aria-label={`Quitar ${nombrePartida(p, ficha)}`}
            title="Quitar de la cotización"
            className="inline-flex size-[34px] cursor-pointer items-center justify-center rounded-[10px] text-tinta-2 shadow-borde hover:bg-suave hover:text-rojo"
          >
            <IconoBasura tam={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-4">
        <div className="min-w-0">
          {p.tipo === "traslado" ? (
            <EditorTraslado
              p={p}
              unidades={datos.unidades}
              viaje={viajeEditor}
              tramosVuelo={tramosVuelo}
              hoteles={hotelesTraslado}
              aeropuertos={aeropuertos}
              llegarAntes={reglas.llegarAntes}
              alCambiar={alCambiar}
            />
          ) : ficha?.tipo === "hotel" ? (
            <EditorHotel
              p={p}
              ficha={ficha}
              viaje={viajeEditor}
              alCambiar={alCambiar}
              alAvisar={alAvisar}
              alAgregarHabitacion={alAgregarHabitacion}
            />
          ) : ficha?.tipo === "vuelo" ? (
            <EditorVuelo
              p={p}
              ficha={ficha}
              viaje={viajeEditor}
              aeropuertos={aeropuertos}
              alConocerAeropuertos={alConocerAeropuertos}
              alCambiar={alCambiar}
              alAvisar={alAvisar}
            />
          ) : ficha?.tipo === "actividad" ? (
            <EditorActividad p={p} ficha={ficha} viaje={viajeEditor} ocupadas={ocupadas} alCambiar={alCambiar} />
          ) : ficha?.tipo === "servicio" ? (
            <EditorServicio p={p} ficha={ficha} viaje={viajeEditor} tramosVuelo={tramosVuelo} alCambiar={alCambiar} />
          ) : (
            <p className="text-[13px] text-tinta-3">Este registro ya no está en el catálogo.</p>
          )}
          <Hallazgos hallazgos={hallazgos} />
        </div>
        <PanelPrecio
          p={p}
          calc={calc}
          fx={fx}
          fixHoy={datos.fixHoy}
          personas={pasajerosConPrecio(viaje.adultos, viaje.menores, viaje.edadesMenores)}
          sinBebes={bebesDe(viaje.edadesMenores, viaje.menores) > 0}
          utilidadBasePb={utilidadBasePb}
          utilidadFijaPb={p.tipo === "vuelo" ? reglas.utilidadVuelosPb : undefined}
          proveedores={proveedoresPara(p.tipo, datos.proveedores)}
          directo={
            p.tipo === "hotel"
              ? "Directo con el hotel"
              : p.tipo === "vuelo"
                ? "Directo con la aerolínea"
                : "Directo"
          }
          alCambiar={alCambiar}
          alElegirProveedor={alElegirProveedor}
        />
      </div>
    </article>
  );
}

// ─── Nota para el cliente de cada sección ───────────────────────────────────

function NotaSeccion({ inicial, alGuardar }: { inicial: string; alGuardar: (t: string) => Promise<string | null> }) {
  const [texto, setTexto] = useState(inicial);
  const [abierta, setAbierta] = useState(!!inicial);
  const [guardada, setGuardada] = useState(inicial.trim());
  const [estado, setEstado] = useState<"" | "guardando" | "guardado">("");
  const [error, setError] = useState<string | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (reloj.current && clearTimeout(reloj.current)), []);

  const hayCambios = texto.trim() !== guardada;

  // Guarda lo que hay en el campo (vacío quita la nota). Si falla, el texto se queda donde está.
  const guardar = async (t: string) => {
    const limpio = t.trim();
    if (limpio === guardada) return;
    setEstado("guardando");
    setError(null);
    const e = await alGuardar(limpio);
    if (e) {
      setEstado("");
      setError(e);
      return;
    }
    setGuardada(limpio);
    setEstado("guardado");
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setEstado(""), 3000);
  };

  const quitar = async () => {
    setTexto("");
    await guardar("");
    setAbierta(false);
  };

  if (!abierta)
    return (
      <div>
        <Boton variante="texto" onClick={() => setAbierta(true)}>
          <IconoMas tam={13} /> Nota para el cliente
        </Boton>
      </div>
    );
  return (
    <div className="rounded-[12px] bg-suave/70 p-3 shadow-borde">
      <label>
        <span className="mb-1 block text-[12.5px] font-semibold text-tinta-2">
          Nota para el cliente <span className="font-normal text-tinta-3">· la ve en su enlace, en esta sección</span>
        </span>
        <textarea
          aria-label="Nota para el cliente"
          autoFocus={!inicial}
          value={texto}
          maxLength={600}
          rows={2}
          onChange={(e) => {
            setTexto(e.target.value);
            setEstado("");
          }}
          onBlur={() => void guardar(texto)}
          placeholder="Por qué elegimos esto para el viaje."
          className="w-full resize-y bg-transparent text-[13.5px] leading-relaxed outline-none placeholder:text-tinta-3/70"
        />
      </label>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Boton
            variante="texto"
            disabled={!hayCambios || estado === "guardando"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void guardar(texto)}
          >
            Guardar nota
          </Boton>
          <Boton variante="texto" onMouseDown={(e) => e.preventDefault()} onClick={() => void quitar()}>
            Quitar nota
          </Boton>
        </div>
        <span role="status" className="text-[12px] text-tinta-3">
          {error ? <span className="text-rojo">{error}</span> : estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : hayCambios ? "Sin guardar" : ""}
        </span>
      </div>
    </div>
  );
}
