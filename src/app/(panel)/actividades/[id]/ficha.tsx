"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  BLOQUES,
  cambiarTipo,
  CLAVES_BLOQUE,
  COBROS,
  CONFIRMACIONES,
  HORARIOS,
  LLEGADAS,
  nombreTipo,
  queSePide,
  SUGERIDOS,
  TIPOS,
  type Bloque as ClaveBloque,
  type Cobro,
  type Confirmacion,
  type Horario,
  type Llegada,
  type TipoActividad,
} from "@/lib/actividades";
import { evaluarPortada } from "@/lib/fotos";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { Interruptor } from "@/components/ui/interruptor";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { IconoAtras, IconoBasura, IconoMas } from "@/components/iconos";
import { Bloque } from "@/components/catalogo/bloque";
import { Opciones } from "@/components/catalogo/lista";
import { PortadaGaleria } from "@/components/catalogo/portada-galeria";
import { BarraCambios } from "@/components/catalogo/barra-cambios";
import type { OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import type { Permisos as PermisosProveedor } from "../../proveedores/textos";
import type { Cambio } from "@/lib/bitacora";
import type { Actividad, OpcionProveedor } from "../datos";
import type { PermisosActividad } from "../textos";
import { guardarFicha, type ResultadoFicha } from "../acciones";
import { DondeReservar } from "./reservar";
import { ColumnaActividad } from "./columna";

const FORM = "ficha-actividad";

const ENTRADA =
  "h-9 w-full rounded-[10px] bg-tarjeta px-2.5 text-[13.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]";

type PlanEditable = { clave: string; nombre: string; incluye: string };
type BoletoEditable = {
  clave: string;
  nombre: string;
  edadDesde: string;
  edadHasta: string;
  gratis: boolean;
};

export function FichaActividad({
  actividad: a,
  ciudades,
  proveedores,
  historial,
  editada,
  permisos,
  permisosProveedor,
}: {
  actividad: Actividad;
  ciudades: OpcionCiudad[];
  proveedores: OpcionProveedor[];
  historial: Cambio[];
  editada: string;
  permisos: PermisosActividad;
  permisosProveedor: PermisosProveedor;
}) {
  const [version, setVersion] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // Lo que pide el armador se calcula con lo que está en pantalla, aunque no se haya guardado.
  const [pide, setPide] = useState(a.pide);

  useEffect(() => {
    if (!sucio) return;
    const antes = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", antes);
    return () => window.removeEventListener("beforeunload", antes);
  }, [sucio]);

  return (
    <>
      <div className="mt-6 mb-5">
        <Link
          href={`/actividades?a=${a.id}`}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-tinta-2 hover:text-tinta"
        >
          <IconoAtras tam={15} /> Actividades
        </Link>
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em]">{a.nombre}</h1>
        <p className="mt-0.5 text-[14.5px] text-tinta-2">
          {a.ciudadCompleta} · {nombreTipo(a.tipo)} ·{" "}
          {a.viajes ? `usado en ${a.viajes} viajes` : "sin viajes todavía"}
        </p>
      </div>

      <div
        className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5 pb-28"
        // Solo los campos de la ficha (los que tienen nombre) cuentan como
        // cambios sin guardar; fotos y proveedores se guardan al momento.
        onChange={(e) => {
          if ((e.target as unknown as HTMLInputElement).name) setSucio(true);
        }}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Formulario
            key={version}
            actividad={a}
            ciudades={ciudades}
            editable={permisos.editar}
            sucio={sucio}
            alCambiar={() => setSucio(true)}
            alCambiarPide={setPide}
            alGuardar={() => {
              setSucio(false);
              setAviso("Ficha guardada · las cotizaciones nuevas ya usan estos datos");
            }}
            alDescartar={() => {
              setSucio(false);
              setPide(a.pide);
              setVersion((v) => v + 1);
            }}
            alAvisar={setAviso}
          />
          <DondeReservar
            actividad={a}
            proveedores={proveedores}
            editable={permisos.editar}
            permisosProveedor={permisosProveedor}
            alAvisar={setAviso}
          />
          <Bloque id="equipo" titulo="Para el equipo" soloEquipo>
            <fieldset disabled={!permisos.editar} className="contents">
              <AreaTexto
                key={version}
                etiqueta="Nota interna"
                id="actividad-notaInterna"
                name="notaInterna"
                form={FORM}
                defaultValue={a.notaInterna ?? ""}
              />
            </fieldset>
          </Bloque>
        </div>
        <ColumnaActividad
          actividad={a}
          pide={pide}
          historial={historial}
          editada={editada}
          permisos={permisos}
          alAvisar={setAviso}
        />
      </div>
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} arriba={sucio} />
    </>
  );
}

function Formulario({
  actividad: a,
  ciudades,
  editable,
  sucio,
  alCambiar,
  alCambiarPide,
  alGuardar,
  alDescartar,
  alAvisar,
}: {
  actividad: Actividad;
  ciudades: OpcionCiudad[];
  editable: boolean;
  sucio: boolean;
  alCambiar: () => void;
  alCambiarPide: (p: string[]) => void;
  alGuardar: () => void;
  alDescartar: () => void;
  alAvisar: (t: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoActividad>(a.tipo);
  const [bloques, setBloques] = useState<ClaveBloque[]>(a.bloques);
  const [descripcion, setDescripcion] = useState(a.descripcion ?? "");
  const [cobro, setCobro] = useState<Cobro | null>(a.cobro);
  const [horario, setHorario] = useState<Horario | null>(a.horarioTipo);
  const [llegada, setLlegada] = useState<Llegada | null>(a.llegada);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(a.confirmacion);
  const [planes, setPlanes] = useState<PlanEditable[]>(() =>
    a.planes.map((p) => ({ clave: p.id, nombre: p.nombre, incluye: p.incluye ?? "" })),
  );
  const [boletos, setBoletos] = useState<BoletoEditable[]>(() =>
    a.boletos.map((b) => ({
      clave: b.id,
      nombre: b.nombre,
      edadDesde: b.edadDesde?.toString() ?? "",
      edadHasta: b.edadHasta?.toString() ?? "",
      gratis: b.gratis,
    })),
  );
  const [salidas, setSalidas] = useState<{ clave: string; hora: string }[]>(() =>
    a.salidas.map((s) => ({ clave: s.hora, hora: s.hora })),
  );
  const [estado, accion, pendiente] = useActionState(async (prev: ResultadoFicha, f: FormData) => {
    const r = await guardarFicha(a.id, prev, f);
    if (r && "guardado" in r) alGuardar();
    return r;
  }, undefined);

  const cambiar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      alCambiar();
    };

  // «En el armador se va a pedir» sigue a la pantalla.
  useEffect(() => {
    alCambiarPide(
      queSePide({
        bloques,
        cobro,
        horarioTipo: horario,
        llegada,
        sePagaEnLugar: a.sePagaEnLugar,
      }),
    );
  }, [bloques, cobro, horario, llegada, a.sePagaEnLugar, alCambiarPide]);

  const elegirTipo = (t: TipoActividad) => {
    if (t === tipo) return;
    const nuevos = cambiarTipo(bloques, t);
    const encendidos = nuevos.length - bloques.length;
    cambiar(setTipo)(t);
    setBloques(nuevos);
    alAvisar(
      `Tipo: ${nombreTipo(t)} · ${encendidos ? "se encendieron los bloques sugeridos; " : ""}los que ya tenían datos siguen igual`,
    );
  };
  const alternar = (b: ClaveBloque) =>
    cambiar(setBloques)(
      bloques.includes(b)
        ? bloques.filter((x) => x !== b)
        : CLAVES_BLOQUE.filter((x) => x === b || bloques.includes(x)),
    );

  const ev = a.portada ? evaluarPortada(a.portada.ancho, a.portada.alto) : null;
  const resumenFotos = [
    ev ? (ev.estado === "lista" ? "Portada 16:9 lista" : ev.titulo) : "Sin portada",
    `${a.galeria.length} ${a.galeria.length === 1 ? "foto" : "fotos"} en la galería`,
  ].join(" · ");
  const sugeridos = SUGERIDOS[tipo];
  const nombreTipoActual = nombreTipo(tipo).toLowerCase();

  return (
    <form
      id={FORM}
      onSubmit={enviarSinVaciar(accion)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
      className="flex min-w-0 flex-col gap-4"
    >
      <input type="hidden" name="tipo" value={tipo} />
      {bloques.map((b) => (
        <input key={b} type="hidden" name="bloques" value={b} />
      ))}
      <input type="hidden" name="cobro" value={cobro ?? ""} />
      <input type="hidden" name="horarioTipo" value={horario ?? ""} />
      <input type="hidden" name="llegada" value={llegada ?? ""} />
      <input type="hidden" name="confirmacion" value={confirmacion ?? ""} />
      <input
        type="hidden"
        name="planes"
        value={JSON.stringify(planes.map((p) => ({ nombre: p.nombre, incluye: p.incluye })))}
      />
      <input
        type="hidden"
        name="boletos"
        value={JSON.stringify(
          boletos.map((b) => ({
            nombre: b.nombre,
            edadDesde: b.edadDesde.trim() || null,
            edadHasta: b.edadHasta.trim() || null,
            gratis: b.gratis,
          })),
        )}
      />
      <input
        type="hidden"
        name="salidas"
        value={JSON.stringify(salidas.map((s) => s.hora).filter(Boolean))}
      />

      <fieldset disabled={!editable} className="contents">
        <Bloque
          titulo="Lo que ve el cliente"
          muestra="En la propuesta y en el viaje"
          descripcion="Lo mismo para cualquier actividad: un parque, un tour, un day pass o algo que no encaje en ninguno."
        >
          <div className="grid grid-cols-2 gap-4">
            <Campo etiqueta="Nombre" id="actividad-nombre" name="nombre" defaultValue={a.nombre} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ciudadId" className="text-[13px] font-semibold">
                Ciudad
              </label>
              <select
                id="ciudadId"
                name="ciudadId"
                defaultValue={a.ciudadId}
                className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              >
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}, {c.detalle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Tipo</span>
            <Opciones
              etiqueta="Tipo"
              opciones={TIPOS.map((t) => ({ valor: t.valor, etiqueta: t.nombre }))}
              elegidas={[tipo]}
              alCambiar={([t]) => elegirTipo(t)}
            />
            <p className="text-[12.5px] text-tinta-3">
              Sirve para filtrar y para la etiqueta que ve el cliente. Al cambiarlo se sugieren bloques, pero
              no se apaga ninguno que ya tenga datos.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Campo
              etiqueta="Duración"
              id="actividad-duracion"
              name="duracion"
              defaultValue={a.duracion ?? ""}
              placeholder="Ej. 4 horas"
              ayuda="Texto libre: «Todo el día», «4 horas», «De 9:00 a 18:00»."
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Portada y galería</span>
              <div className="flex h-10 items-center gap-2 rounded-campo bg-tarjeta px-3 text-sm shadow-borde">
                <span className="min-w-0 flex-1 truncate">{resumenFotos}</span>
                <a href="#fotos" className="font-semibold text-azul-oscuro hover:underline">
                  Editar fotos
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <AreaTexto
              etiqueta="Descripción"
              id="actividad-descripcion"
              name="descripcion"
              value={descripcion}
              maxLength={400}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué es y qué se hace: el recorrido, lo que se ve, cuánto tiempo libre hay."
            />
            <p className="mt-1 text-right text-[12px] text-tinta-3">{descripcion.length} de 400</p>
          </div>
        </Bloque>
      </fieldset>

      <PortadaGaleria
        dueno={{ tipo: "actividad", id: a.id }}
        portada={a.portada}
        galeria={a.galeria}
        editable={editable}
        alAvisar={alAvisar}
        descripcion="La portada va en la tarjeta de la actividad y tiene un formato fijo. La galería es lo que se ve al abrir las fotos."
        galeriaNota="el lugar, la actividad, lo que incluye"
        pie="Se ordenan arrastrando."
      />

      <fieldset disabled={!editable} className="contents">
        <Bloque
          id="bloques"
          titulo="Bloques de esta actividad"
          extra={`${bloques.length} de 8 encendidos`}
          descripcion="Se encienden solo los que esta actividad necesita. En el armador aparece solo lo que está encendido. Los precios no van aquí: se capturan en cada cotización."
        >
          <ul className="border-t border-linea">
            {CLAVES_BLOQUE.map((k) => {
              const on = bloques.includes(k);
              return (
                <li
                  key={k}
                  aria-label={BLOQUES[k].titulo}
                  className="flex gap-3 border-b border-linea py-4 last:border-b-0"
                >
                  <Interruptor
                    encendido={on}
                    alCambiar={() => alternar(k)}
                    etiqueta={BLOQUES[k].titulo}
                    disabled={!editable}
                    tam="grande"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className={`text-[15px] font-semibold ${on ? "" : "text-tinta-2"}`}>
                        {BLOQUES[k].titulo}
                      </b>
                      {!on && sugeridos.includes(k) ? (
                        <span className="rounded-md bg-azul-tenue px-1.5 py-0.5 text-[11.5px] font-semibold text-azul-oscuro">
                          Sugerido para {nombreTipoActual}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[13px] text-tinta-3">{BLOQUES[k].sub}</p>
                    <div hidden={!on} className="mt-3">
                      {k === "cobro" ? (
                        <>
                          <Opciones
                            etiqueta="Cómo se cobra"
                            opciones={COBROS.map((c) => ({ valor: c.valor, etiqueta: c.nombre }))}
                            elegidas={cobro ? [cobro] : []}
                            alCambiar={([v]) => cambiar(setCobro)(v)}
                          />
                          {cobro === "grupo" ? (
                            <div className="mt-3 w-56">
                              <Campo
                                etiqueta="Hasta cuántas personas"
                                id="actividad-maxPersonasGrupo"
                                name="maxPersonasGrupo"
                                inputMode="numeric"
                                defaultValue={a.maxPersonasGrupo ?? ""}
                              />
                            </div>
                          ) : (
                            <input type="hidden" name="maxPersonasGrupo" value={a.maxPersonasGrupo ?? ""} />
                          )}
                          <Pista>{COBROS.find((c) => c.valor === cobro)?.pista}</Pista>
                        </>
                      ) : k === "planes" ? (
                        <Filas
                          columnas={["Plan", "Qué incluye"]}
                          vacio="Sin planes todavía."
                          agregar="Agregar plan"
                          filas={planes}
                          alAgregar={() =>
                            cambiar(setPlanes)([
                              ...planes,
                              { clave: crypto.randomUUID(), nombre: "", incluye: "" },
                            ])
                          }
                          alQuitar={(i) => cambiar(setPlanes)(planes.filter((_, j) => j !== i))}
                          editable={editable}
                          celdas={(p, i) => {
                            const poner = (x: Partial<PlanEditable>) =>
                              cambiar(setPlanes)(planes.map((y, j) => (j === i ? { ...y, ...x } : y)));
                            return [
                              <input
                                key="n"
                                aria-label="Nombre del plan"
                                value={p.nombre}
                                onChange={(e) => poner({ nombre: e.target.value })}
                                placeholder="Ej. Básico"
                                className={ENTRADA}
                              />,
                              <input
                                key="i"
                                aria-label="Qué incluye el plan"
                                value={p.incluye}
                                onChange={(e) => poner({ incluye: e.target.value })}
                                placeholder="Ej. Entrada, ríos y espectáculo"
                                className={ENTRADA}
                              />,
                            ];
                          }}
                        />
                      ) : k === "boletos" ? (
                        <Filas
                          columnas={["Boleto", "Edad"]}
                          vacio="Sin boletos todavía."
                          agregar="Agregar boleto"
                          filas={boletos}
                          alAgregar={() =>
                            cambiar(setBoletos)([
                              ...boletos,
                              {
                                clave: crypto.randomUUID(),
                                nombre: "",
                                edadDesde: "",
                                edadHasta: "",
                                gratis: false,
                              },
                            ])
                          }
                          alQuitar={(i) => cambiar(setBoletos)(boletos.filter((_, j) => j !== i))}
                          editable={editable}
                          celdas={(b, i) => {
                            const poner = (x: Partial<BoletoEditable>) =>
                              cambiar(setBoletos)(boletos.map((y, j) => (j === i ? { ...y, ...x } : y)));
                            const nombre = b.nombre || "boleto";
                            return [
                              <input
                                key="n"
                                aria-label="Nombre del boleto"
                                value={b.nombre}
                                onChange={(e) => poner({ nombre: e.target.value })}
                                placeholder="Ej. Adulto"
                                className={ENTRADA}
                              />,
                              <div key="e" className="flex items-center gap-2 text-[13.5px] text-tinta-2">
                                De
                                <input
                                  aria-label={`Edad desde, ${nombre}`}
                                  inputMode="numeric"
                                  value={b.edadDesde}
                                  onChange={(e) => poner({ edadDesde: e.target.value })}
                                  className="num h-9 w-14 rounded-[10px] bg-tarjeta px-2 text-center text-tinta shadow-borde"
                                />
                                a
                                <input
                                  aria-label={`Edad hasta, ${nombre}`}
                                  inputMode="numeric"
                                  value={b.edadHasta}
                                  onChange={(e) => poner({ edadHasta: e.target.value })}
                                  placeholder="más"
                                  className="num h-9 w-14 rounded-[10px] bg-tarjeta px-2 text-center text-tinta shadow-borde placeholder:text-tinta-3"
                                />
                                años
                                <label className="ml-2 inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={b.gratis}
                                    onChange={(e) => poner({ gratis: e.target.checked })}
                                    className="size-4 accent-azul"
                                  />
                                  Gratis
                                </label>
                              </div>,
                            ];
                          }}
                        />
                      ) : k === "horarios" ? (
                        <>
                          <Opciones
                            etiqueta="Horarios"
                            opciones={HORARIOS.map((h) => ({ valor: h.valor, etiqueta: h.nombre }))}
                            elegidas={horario ? [horario] : []}
                            alCambiar={([v]) => cambiar(setHorario)(v)}
                          />
                          {horario === "salidas" ? (
                            <div className="mt-3">
                              <ul aria-label="Horas de salida" className="flex flex-wrap items-center gap-2">
                                {salidas.map((s, i) => (
                                  <li key={s.clave} className="inline-flex items-center gap-1">
                                    <input
                                      type="time"
                                      aria-label={`Salida ${i + 1}`}
                                      value={s.hora}
                                      onChange={(e) =>
                                        cambiar(setSalidas)(
                                          salidas.map((x, j) =>
                                            j === i ? { ...x, hora: e.target.value } : x,
                                          ),
                                        )
                                      }
                                      className="num h-9 rounded-[10px] bg-tarjeta px-2.5 text-[13.5px] shadow-borde"
                                    />
                                    <button
                                      type="button"
                                      aria-label={`Quitar salida ${i + 1}`}
                                      onClick={() => cambiar(setSalidas)(salidas.filter((_, j) => j !== i))}
                                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-tinta-3 hover:bg-suave hover:text-rojo"
                                    >
                                      <IconoBasura tam={14} />
                                    </button>
                                  </li>
                                ))}
                                {editable ? (
                                  <li>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        cambiar(setSalidas)([
                                          ...salidas,
                                          { clave: crypto.randomUUID(), hora: "" },
                                        ])
                                      }
                                      className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
                                    >
                                      <IconoMas tam={15} /> Agregar salida
                                    </button>
                                  </li>
                                ) : null}
                              </ul>
                            </div>
                          ) : null}
                          <div className="mt-3">
                            <input
                              name="horarioTexto"
                              aria-label="Horario que ve el cliente"
                              defaultValue={a.horarioTexto ?? ""}
                              placeholder={
                                horario === "salidas"
                                  ? "Ej. Salidas 9:00 AM y 11:00 AM"
                                  : "Ej. Abierto de 8:30 AM a 10:00 PM"
                              }
                              className={`${ENTRADA} h-10`}
                            />
                          </div>
                          <Pista>{HORARIOS.find((h) => h.valor === horario)?.pista}</Pista>
                        </>
                      ) : k === "llegada" ? (
                        <>
                          <Opciones
                            etiqueta="Cómo llega el cliente"
                            opciones={LLEGADAS.map((l) => ({ valor: l.valor, etiqueta: l.nombre }))}
                            elegidas={llegada ? [llegada] : []}
                            alCambiar={([v]) => cambiar(setLlegada)(v)}
                          />
                          <div className="mt-3">
                            <input
                              name="llegadaTexto"
                              aria-label="Cómo llega, en palabras del cliente"
                              defaultValue={a.llegadaTexto ?? ""}
                              placeholder="Ej. Muelle de Holbox, frente al malecón, 15 minutos antes."
                              className={`${ENTRADA} h-10`}
                            />
                          </div>
                          <Pista>{LLEGADAS.find((l) => l.valor === llegada)?.pista}</Pista>
                        </>
                      ) : k === "incluye" ? (
                        <div className="grid grid-cols-3 gap-3">
                          <AreaTexto
                            etiqueta="Incluye"
                            id="actividad-incluye"
                            name="incluye"
                            defaultValue={a.incluye ?? ""}
                          />
                          <AreaTexto
                            etiqueta="No incluye"
                            id="actividad-noIncluye"
                            name="noIncluye"
                            defaultValue={a.noIncluye ?? ""}
                          />
                          <AreaTexto
                            etiqueta="Qué llevar"
                            id="actividad-queLlevar"
                            name="queLlevar"
                            defaultValue={a.queLlevar ?? ""}
                          />
                        </div>
                      ) : k === "requisitos" ? (
                        <textarea
                          name="requisitos"
                          aria-label="Requisitos"
                          rows={2}
                          defaultValue={a.requisitos ?? ""}
                          placeholder="Ej. Estatura mínima de 1.20 m para las tirolesas."
                          className="min-h-16 w-full rounded-campo bg-tarjeta px-3 py-2.5 text-sm leading-snug shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
                        />
                      ) : (
                        <>
                          <Opciones
                            etiqueta="Cómo se confirma"
                            opciones={CONFIRMACIONES.map((c) => ({ valor: c.valor, etiqueta: c.nombre }))}
                            elegidas={confirmacion ? [confirmacion] : []}
                            alCambiar={([v]) => cambiar(setConfirmacion)(v)}
                          />
                          <Pista>{CONFIRMACIONES.find((c) => c.valor === confirmacion)?.pista}</Pista>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Bloque>
      </fieldset>

      <BarraCambios
        visible={sucio}
        error={estado && "error" in estado ? estado.error : null}
        pendiente={pendiente}
        alDescartar={alDescartar}
      />
    </form>
  );
}

function Pista({ children }: { children?: string }) {
  return children ? <p className="mt-2 text-[12.5px] text-tinta-3">{children}</p> : null;
}

/** Tabla editable de planes o boletos: renglones, «Agregar» y quitar. */
function Filas<T extends { clave: string }>({
  columnas,
  filas,
  celdas,
  vacio,
  agregar,
  alAgregar,
  alQuitar,
  editable,
}: {
  columnas: [string, string];
  filas: T[];
  celdas: (f: T, i: number) => [React.ReactNode, React.ReactNode];
  vacio: string;
  agregar: string;
  alAgregar: () => void;
  alQuitar: (i: number) => void;
  editable: boolean;
}) {
  return (
    <div>
      {filas.length ? (
        <table className="w-full table-fixed text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase">
              <th className="w-[38%] pb-1.5">{columnas[0]}</th>
              <th className="pb-1.5">{columnas[1]}</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const [a, b] = celdas(f, i);
              return (
                <tr key={f.clave}>
                  <td className="py-1 pr-2">{a}</td>
                  <td className="py-1 pr-2">{b}</td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      aria-label={`Quitar renglón ${i + 1} de ${columnas[0].toLowerCase()}`}
                      onClick={() => alQuitar(i)}
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-tinta-3 hover:bg-suave hover:text-rojo"
                    >
                      <IconoBasura tam={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-[13px] text-tinta-3">{vacio}</p>
      )}
      {editable ? (
        <button
          type="button"
          onClick={alAgregar}
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
        >
          <IconoMas tam={15} /> {agregar}
        </button>
      ) : null}
    </div>
  );
}
