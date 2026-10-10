"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { MONEDAS, type Moneda } from "@/lib/dinero";
import { REGIMENES, SE_COBRA, type SeCobra } from "@/lib/hoteles";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { IconoAtras, IconoBasura, IconoMas, IconoOjo } from "@/components/iconos";
import type { Cambio, Hotel, OpcionCiudad, OpcionProveedor } from "../datos";
import type { PermisosHotel } from "../piezas";
import { guardarFicha, type ResultadoFicha } from "../acciones";
import { Bloque, Subtitulo } from "./bloque";
import { FotosHotel } from "./fotos-hotel";
import { Habitaciones } from "./habitaciones";
import { ColumnaFicha } from "./columna";
import { VistaPrevia } from "./vista-previa";

type CargoEditable = { clave: string; concepto: string; monto: string; moneda: Moneda; seCobra: SeCobra };
type DondeEditable = { proveedorId: string; idExterno: string };

const CALIFICACIONES = ["5.0", "4.5", "4.0", "3.5", "3.0", "2.5", "2.0", "1.5", "1.0"];

export function FichaHotel({
  hotel: h,
  ciudades,
  proveedores,
  historial,
  editada,
  otros,
  unidoCon,
  permisos,
  fuenteCliente,
}: {
  fuenteCliente: string;
  hotel: Hotel;
  ciudades: OpcionCiudad[];
  proveedores: OpcionProveedor[];
  historial: Cambio[];
  editada: string;
  otros: { id: string; nombre: string; ciudad: string }[];
  unidoCon: { id: string; nombre: string } | null;
  permisos: PermisosHotel;
}) {
  const [version, setVersion] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vista, setVista] = useState(false);

  // Al salir con cambios sin guardar, el navegador pregunta.
  useEffect(() => {
    if (!sucio) return;
    const antes = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", antes);
    return () => window.removeEventListener("beforeunload", antes);
  }, [sucio]);

  return (
    <>
      <div className="mt-6 mb-5 flex items-end justify-between gap-4">
        <div>
          <Link
            href={`/hoteles?h=${h.id}`}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-tinta-2 hover:text-tinta"
          >
            <IconoAtras tam={15} /> Hoteles
          </Link>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em]">{h.nombre}</h1>
          <p className="mt-0.5 text-[14.5px] text-tinta-2">
            {h.ciudadCompleta} · {h.viajes ? `usado en ${h.viajes} viajes` : "sin viajes todavía"}
          </p>
        </div>
        <Boton variante="secundario" onClick={() => setVista(true)}>
          <IconoOjo tam={15} /> Vista previa como cliente
        </Boton>
      </div>

      {unidoCon ? (
        <p role="status" className="mb-4 rounded-xl bg-ambar-tenue px-4 py-3 text-[13.5px]">
          Este hotel se unió con{" "}
          <Link href={`/hoteles/${unidoCon.id}`} className="font-semibold text-azul-oscuro hover:underline">
            {unidoCon.nombre}
          </Link>
          ; ya no aparece en la lista ni al cotizar.
        </p>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_260px] items-start gap-5 pb-28">
        <Formulario
          key={version}
          hotel={h}
          ciudades={ciudades}
          proveedores={proveedores}
          editable={permisos.editar && !unidoCon}
          sucio={sucio}
          alCambiar={() => setSucio(true)}
          alGuardar={() => {
            setSucio(false);
            setAviso("Ficha guardada · las cotizaciones nuevas ya usan estos datos");
          }}
          alDescartar={() => {
            setSucio(false);
            setVersion((v) => v + 1);
          }}
          alAvisar={setAviso}
        />
        <ColumnaFicha
          hotel={h}
          historial={historial}
          editada={editada}
          otros={otros}
          permisos={permisos}
          unido={!!unidoCon}
          alAvisar={setAviso}
        />
      </div>

      <VistaPrevia hotel={h} abierto={vista} alCerrar={() => setVista(false)} fuenteCliente={fuenteCliente} />
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}

function Formulario({
  hotel: h,
  ciudades,
  proveedores,
  editable,
  sucio,
  alCambiar,
  alGuardar,
  alDescartar,
  alAvisar,
}: {
  hotel: Hotel;
  ciudades: OpcionCiudad[];
  proveedores: OpcionProveedor[];
  editable: boolean;
  sucio: boolean;
  alCambiar: () => void;
  alGuardar: () => void;
  alDescartar: () => void;
  alAvisar: (t: string) => void;
}) {
  const [regimenes, setRegimenes] = useState<string[]>(h.regimenes);
  const [descripcion, setDescripcion] = useState(h.descripcion ?? "");
  const [cargos, setCargos] = useState<CargoEditable[]>(() =>
    h.cargos.map((c) => ({
      clave: c.id,
      concepto: c.concepto,
      monto: (c.montoCentavos / 100).toFixed(2),
      moneda: c.moneda,
      seCobra: c.seCobra,
    })),
  );
  const [sinCargos, setSinCargos] = useState(h.sinCargos);
  const [donde, setDonde] = useState<DondeEditable[]>(() =>
    h.dondeReservar.map((d) => ({ proveedorId: d.proveedorId, idExterno: d.idExterno ?? "" })),
  );
  const [eligiendo, setEligiendo] = useState(false);
  const [estado, accion, pendiente] = useActionState(async (prev: ResultadoFicha, f: FormData) => {
    const r = await guardarFicha(h.id, prev, f);
    if (r && "guardado" in r) alGuardar();
    return r;
  }, undefined);

  const cambiar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      alCambiar();
    };
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const nombreRegimenes = REGIMENES.filter((r) => regimenes.includes(r.clave)).map((r) => r.nombre);

  return (
    <form
      onSubmit={enviarSinVaciar(accion)}
      // Solo los campos de la ficha (los que tienen nombre) cuentan como cambios
      // sin guardar; fotos y habitaciones se guardan al momento.
      onChange={(e) => {
        if ((e.target as unknown as HTMLInputElement).name) alCambiar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
      className="flex min-w-0 flex-col gap-4"
    >
      <fieldset disabled={!editable} className="contents">
        <Bloque
          titulo="Lo que ve el cliente"
          muestra="En la propuesta y en el viaje"
          descripcion="Encabezado del hotel: régimen, nombre y calificación de Tripadvisor."
        >
          <div className="grid grid-cols-2 gap-4">
            <Campo etiqueta="Nombre" name="nombre" defaultValue={h.nombre} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ciudadId" className="text-[13px] font-semibold">
                Ciudad
              </label>
              <select
                id="ciudadId"
                name="ciudadId"
                defaultValue={h.ciudadId}
                className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              >
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}, {c.detalle}
                  </option>
                ))}
              </select>
              <p className="text-[12.5px] text-tinta-3">
                La lista la comparten todos los hoteles, actividades y viajes.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Subtitulo>Calificación de Tripadvisor</Subtitulo>
            <div className="grid grid-cols-[1fr_120px_150px] gap-2.5">
              <input
                name="tripadvisor"
                aria-label="ID de Tripadvisor"
                defaultValue={h.tripadvisorId ?? ""}
                placeholder="ID o dirección de la página del hotel"
                className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              />
              <select
                name="tripadvisorCalificacion"
                aria-label="Calificación"
                defaultValue={h.tripadvisorCalificacion ? (h.tripadvisorCalificacion / 10).toFixed(1) : ""}
                className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde"
              >
                <option value="">Calificación</option>
                {CALIFICACIONES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                name="tripadvisorOpiniones"
                aria-label="Opiniones"
                inputMode="numeric"
                defaultValue={h.tripadvisorOpiniones ? h.tripadvisorOpiniones.toLocaleString("en-US") : ""}
                placeholder="Opiniones"
                className="num h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              />
            </div>
            <p className="mt-1.5 text-[12.5px] text-tinta-3">
              El ID está en la dirección de la página del hotel en Tripadvisor, después de «-d». La
              calificación y las opiniones se capturan a mano
              {h.tripadvisorActualizado ? `; la última vez, el ${h.tripadvisorActualizado}` : ""}.
            </p>
          </div>

          <div className="mt-4">
            <Subtitulo>Régimen que maneja</Subtitulo>
            <div role="group" aria-label="Régimen que maneja" className="flex gap-1.5">
              {REGIMENES.map((r) => {
                const on = regimenes.includes(r.clave);
                return (
                  <label
                    key={r.clave}
                    title={r.nombre}
                    className={`inline-flex h-[34px] min-w-11 cursor-pointer items-center justify-center rounded-[10px] px-2.5 text-[13px] font-bold has-focus-visible:outline-2 has-focus-visible:outline-azul ${on ? "bg-azul-tenue text-azul-oscuro shadow-[inset_0_0_0_1.5px_var(--color-azul)]" : "bg-tarjeta text-tinta-2 shadow-borde"}`}
                  >
                    <input
                      type="checkbox"
                      name="regimenes"
                      value={r.clave}
                      checked={on}
                      aria-label={r.nombre}
                      onChange={() =>
                        setRegimenes(on ? regimenes.filter((x) => x !== r.clave) : [...regimenes, r.clave])
                      }
                      className="sr-only"
                    />
                    {r.clave}
                  </label>
                );
              })}
            </div>
            <p className={`mt-1.5 text-[12.5px] ${nombreRegimenes.length ? "text-tinta-3" : "text-ambar"}`}>
              {nombreRegimenes.length
                ? `${nombreRegimenes.join(" · ")} · en cada cotización se elige cuál se vende`
                : "Falta elegir al menos uno"}
            </p>
          </div>

          <div className="mt-4">
            <AreaTexto
              etiqueta="Descripción"
              name="descripcion"
              value={descripcion}
              maxLength={400}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Dónde está y qué tiene: playa, albercas, restaurantes, club de niños."
            />
            <p className="mt-1 text-right text-[12px] text-tinta-3">{descripcion.length} de 400</p>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-4">
            <Campo etiqueta="Dirección" name="direccion" defaultValue={h.direccion ?? ""} />
            <Campo
              etiqueta="Liga de Google Maps"
              name="ligaMaps"
              defaultValue={h.ligaMaps ?? ""}
              placeholder="https://maps.app.goo.gl/…"
              ayuda="Es el botón «Cómo llegar» del cliente."
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Campo
              etiqueta="Teléfono del hotel"
              name="telefonoPublico"
              defaultValue={h.telefonoPublico ?? ""}
            />
          </div>
          <p className="mt-1.5 text-[12.5px] text-tinta-3">
            Lo ve el cliente en su viaje confirmado. El de reservaciones, solo para el equipo, va abajo.
          </p>
        </Bloque>
      </fieldset>

      <FotosHotel hotel={h} editable={editable} alAvisar={alAvisar} />
      <Habitaciones hotel={h} proveedores={proveedores} editable={editable} alAvisar={alAvisar} />

      <fieldset disabled={!editable} className="contents">
        <Bloque
          id="llegada"
          titulo="Llegada, salida y cargos en el hotel"
          muestra="En el viaje confirmado"
          descripcion="Los cargos se muestran aparte, en «Pagas directamente en el hotel». No se suman al total de la cotización."
        >
          <div className="grid grid-cols-3 gap-4">
            <Campo
              etiqueta="Llegada desde"
              name="llegadaDesde"
              type="time"
              defaultValue={h.llegadaDesde ?? ""}
            />
            <Campo
              etiqueta="Salida hasta"
              name="salidaHasta"
              type="time"
              defaultValue={h.salidaHasta ?? ""}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Edad de menores</span>
              <div className="flex h-10 items-center gap-2 text-sm text-tinta-2">
                De
                <input
                  name="edadMenoresDe"
                  aria-label="Edad de menores desde"
                  inputMode="numeric"
                  defaultValue={h.edadMenoresDe ?? ""}
                  className="num h-10 w-14 rounded-campo bg-tarjeta px-2 text-center text-tinta shadow-borde"
                />
                a
                <input
                  name="edadMenoresA"
                  aria-label="Edad de menores hasta"
                  inputMode="numeric"
                  defaultValue={h.edadMenoresA ?? ""}
                  className="num h-10 w-14 rounded-campo bg-tarjeta px-2 text-center text-tinta shadow-borde"
                />
                años
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Campo
              etiqueta="Llegada anticipada"
              name="llegadaAnticipada"
              defaultValue={h.llegadaAnticipada ?? ""}
              placeholder="Ej. Puedes dejar las maletas y usar las albercas desde tu llegada."
            />
          </div>
          <div className="mt-4">
            <AreaTexto
              etiqueta="Reglas del hotel · opcional"
              name="reglas"
              defaultValue={h.reglas ?? ""}
              placeholder="Ej. Se pide identificación oficial y tarjeta de crédito para el depósito de incidentales."
            />
          </div>

          <div className="mt-4">
            <Subtitulo>Cargos que se pagan en el hotel</Subtitulo>
            <input
              type="hidden"
              name="cargos"
              value={JSON.stringify(cargos.map(({ clave, ...c }) => (void clave, c)))}
            />
            {cargos.length ? (
              <table className="w-full table-fixed text-[13.5px]">
                <thead>
                  <tr className="text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase">
                    <th className="pb-1.5">Concepto</th>
                    <th className="w-[110px] pb-1.5">Monto</th>
                    <th className="w-[92px] pb-1.5">Moneda</th>
                    <th className="w-[200px] pb-1.5">Se cobra</th>
                    <th className="w-9" />
                  </tr>
                </thead>
                <tbody>
                  {cargos.map((c, i) => {
                    const poner = (p: Partial<CargoEditable>) =>
                      cambiar(setCargos)(cargos.map((x, j) => (j === i ? { ...x, ...p } : x)));
                    return (
                      <tr key={c.clave} aria-label={c.concepto || "Cargo nuevo"}>
                        <td className="py-1 pr-2">
                          <input
                            aria-label="Concepto"
                            value={c.concepto}
                            onChange={(e) => poner({ concepto: e.target.value })}
                            placeholder="Ej. Depósito en garantía"
                            className="h-9 w-full rounded-[10px] bg-tarjeta px-2.5 shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            aria-label="Monto"
                            inputMode="decimal"
                            value={c.monto}
                            onChange={(e) => poner({ monto: e.target.value })}
                            placeholder="0.00"
                            className="num h-9 w-full rounded-[10px] bg-tarjeta px-2.5 text-right shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <select
                            aria-label="Moneda"
                            value={c.moneda}
                            onChange={(e) => poner({ moneda: e.target.value as Moneda })}
                            className="h-9 w-full rounded-[10px] bg-tarjeta px-2 shadow-borde"
                          >
                            {MONEDAS.map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 pr-2">
                          <select
                            aria-label="Se cobra"
                            value={c.seCobra}
                            onChange={(e) => poner({ seCobra: e.target.value as SeCobra })}
                            className="h-9 w-full rounded-[10px] bg-tarjeta px-2 shadow-borde"
                          >
                            {SE_COBRA.map((s) => (
                              <option key={s.valor} value={s.valor}>
                                {s.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            aria-label={`Quitar ${c.concepto || "cargo"}`}
                            onClick={() => cambiar(setCargos)(cargos.filter((_, j) => j !== i))}
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
              <label className="flex items-center gap-2 text-[13.5px] text-tinta-2">
                <input
                  type="checkbox"
                  name="sinCargos"
                  value="si"
                  checked={sinCargos}
                  onChange={(e) => setSinCargos(e.target.checked)}
                  className="size-4 accent-azul"
                />
                Este hotel no cobra nada aparte (impuesto de saneamiento, resort fee, depósito)
              </label>
            )}
            {editable ? (
              <button
                type="button"
                onClick={() =>
                  cambiar(setCargos)([
                    ...cargos,
                    {
                      clave: crypto.randomUUID(),
                      concepto: "",
                      monto: "",
                      moneda: "MXN",
                      seCobra: "estancia",
                    },
                  ])
                }
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
              >
                <IconoMas tam={15} /> Agregar cargo
              </button>
            ) : null}
          </div>
        </Bloque>

        <Bloque
          id="reservar"
          titulo="Dónde se puede reservar"
          soloEquipo
          descripcion="Las plataformas donde existe este hotel, con su ID en cada una. No obliga a reservar en ninguna: la plataforma y la moneda de cada reserva se eligen en el armador, según la tarifa."
        >
          <input type="hidden" name="donde" value={JSON.stringify(donde)} />
          {donde.length ? (
            <ul>
              {donde.map((d, i) => {
                const p = porId.get(d.proveedorId);
                return (
                  <li
                    key={d.proveedorId}
                    aria-label={p?.nombre}
                    className="grid grid-cols-[150px_1fr_auto_auto] items-center gap-3 border-t border-linea py-2.5 first:border-t-0"
                  >
                    <div>
                      <b className="block text-[13.5px] font-semibold">
                        {p?.nombre ?? "Proveedor archivado"}
                      </b>
                      <span className="text-[12px] text-tinta-3">
                        {p?.tipo === "directo" ? "Trato directo" : "Plataforma"}
                      </span>
                    </div>
                    {p?.tipo === "directo" ? (
                      <span className="text-[13px] text-tinta-3">
                        Sus datos y cuentas están en Proveedores
                      </span>
                    ) : (
                      <input
                        aria-label={`ID del hotel en ${p?.nombre ?? "la plataforma"}`}
                        value={d.idExterno}
                        onChange={(e) =>
                          cambiar(setDonde)(
                            donde.map((x, j) => (j === i ? { ...x, idExterno: e.target.value } : x)),
                          )
                        }
                        placeholder="ID del hotel en la plataforma · opcional"
                        className="num h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
                      />
                    )}
                    <Link
                      href={`/proveedores?p=${d.proveedorId}`}
                      className="text-[13px] font-semibold text-azul-oscuro hover:underline"
                    >
                      Ver proveedor
                    </Link>
                    <button
                      type="button"
                      aria-label={`Quitar ${p?.nombre ?? "proveedor"}`}
                      onClick={() => cambiar(setDonde)(donde.filter((_, j) => j !== i))}
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-tinta-3 hover:bg-suave hover:text-rojo"
                    >
                      <IconoBasura tam={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13.5px] text-tinta-3">
              Todavía no hay plataformas ni trato directo para este hotel.
            </p>
          )}
          {editable ? (
            eligiendo ? (
              <select
                autoFocus
                aria-label="Plataforma o trato directo"
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  cambiar(setDonde)([...donde, { proveedorId: e.target.value, idExterno: "" }]);
                  setEligiendo(false);
                }}
                onBlur={() => setEligiendo(false)}
                className="mt-2 h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde"
              >
                <option value="">Elegir plataforma o proveedor directo</option>
                {(["plataforma", "directo"] as const).map((t) => (
                  <optgroup key={t} label={t === "plataforma" ? "Plataformas" : "Trato directo"}>
                    {proveedores
                      .filter((p) => p.tipo === t && !donde.some((d) => d.proveedorId === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => setEligiendo(true)}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
              >
                <IconoMas tam={15} /> Agregar plataforma o trato directo
              </button>
            )
          ) : null}
        </Bloque>

        <Bloque id="equipo" titulo="Para el equipo" soloEquipo>
          <div className="grid grid-cols-2 gap-4">
            <Campo
              etiqueta="Teléfono de reservaciones"
              name="telefonoReservaciones"
              defaultValue={h.telefonoReservaciones ?? ""}
              ayuda="Aparece en el viaje cuando toca corroborar una clave."
            />
            <Campo
              etiqueta="Correo de reservaciones"
              name="correoReservaciones"
              type="email"
              defaultValue={h.correoReservaciones ?? ""}
            />
          </div>
          <div className="mt-4">
            <AreaTexto etiqueta="Nota interna" name="notaInterna" defaultValue={h.notaInterna ?? ""} />
          </div>
        </Bloque>
      </fieldset>

      {sucio || (estado && "error" in estado) ? (
        <div
          role="region"
          aria-label="Cambios sin guardar"
          className="fixed bottom-5 left-1/2 z-40 flex w-[min(760px,calc(100vw-32px))] -translate-x-1/2 items-center gap-4 rounded-[16px] bg-tinta px-5 py-3 text-white shadow-menu"
        >
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] font-semibold">Cambios sin guardar</b>
            <span
              className={`text-[12.5px] ${estado && "error" in estado ? "text-[#ffb4a8]" : "text-white/70"}`}
              role={estado && "error" in estado ? "alert" : undefined}
            >
              {estado && "error" in estado
                ? estado.error
                : "Las cotizaciones ya enviadas no cambian; las nuevas usan la ficha guardada."}
            </span>
          </div>
          <button
            type="button"
            onClick={alDescartar}
            className="h-9 cursor-pointer rounded-[10px] px-3 text-[13.5px] font-semibold text-white/85 hover:bg-white/10"
          >
            Descartar
          </button>
          <button
            type="submit"
            disabled={pendiente}
            className="h-9 cursor-pointer rounded-[10px] bg-azul px-4 text-[13.5px] font-semibold text-white hover:bg-azul-oscuro disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
