"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  MODELO_SUGERIDO,
  MODELOS,
  modelo,
  nombreTipo,
  queSePide,
  VARIANTES,
  type ModeloCobro,
  type TipoServicio,
} from "@/lib/servicios";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { IconoAtras, IconoBasura, IconoMas } from "@/components/iconos";
import { Bloque } from "@/components/catalogo/bloque";
import { Opciones } from "@/components/catalogo/lista";
import { BarraCambios } from "@/components/catalogo/barra-cambios";
import type { OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import type { Cambio } from "@/lib/bitacora";
import { DondeReservar } from "../../proveedores/donde-reservar";
import type { Permisos as PermisosProveedor } from "../../proveedores/textos";
import type { OpcionProveedor, Servicio } from "../datos";
import type { PermisosServicio } from "../textos";
import {
  guardarFicha,
  guardarIdLiga,
  ligarProveedor,
  quitarLiga,
  variaPorReserva,
  type ResultadoFicha,
} from "../acciones";
import { ColumnaServicio } from "./columna";

const FORM = "ficha-servicio";

const ENTRADA =
  "h-9 w-full rounded-[10px] bg-tarjeta px-2.5 text-[13.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]";

type VarianteEditable = {
  clave: string;
  nombre: string;
  pasajeros: string;
  maletas: string;
  detalle: string;
};

/** Mismo patrón que la ficha de actividad, más corto: sin fotos ni bloques que se encienden. */
export function FichaServicio({
  servicio: s,
  ciudades,
  proveedores,
  historial,
  editado,
  permisos,
  permisosProveedor,
}: {
  servicio: Servicio;
  ciudades: OpcionCiudad[];
  proveedores: OpcionProveedor[];
  historial: Cambio[];
  editado: string;
  permisos: PermisosServicio;
  permisosProveedor: PermisosProveedor;
}) {
  const [version, setVersion] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // Lo que pide el armador se calcula con lo que está en pantalla, aunque no se haya guardado.
  const [pide, setPide] = useState(s.pide);

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
          href={`/servicios?s=${s.id}`}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-tinta-2 hover:text-tinta"
        >
          <IconoAtras tam={15} /> Servicios
        </Link>
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em]">{s.nombre}</h1>
        <p className="mt-0.5 text-[14.5px] text-tinta-2">
          {s.destino} · {nombreTipo(s.tipo)} ·{" "}
          {s.viajes ? `usado en ${s.viajes} viajes` : "sin viajes todavía"}
        </p>
      </div>

      <div
        className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5 pb-28"
        // Solo los campos de la ficha (los que tienen nombre) cuentan como
        // cambios sin guardar; los proveedores se guardan al momento.
        onChange={(e) => {
          if ((e.target as unknown as HTMLInputElement).name) setSucio(true);
        }}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Formulario
            key={version}
            servicio={s}
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
              setPide(s.pide);
              setVersion((v) => v + 1);
            }}
          />
          <DondeReservar
            objeto="este servicio"
            ligados={s.ligados}
            proveedores={proveedores}
            editable={permisos.editar}
            permisosProveedor={permisosProveedor}
            alAvisar={setAviso}
            ligar={(p) => ligarProveedor(s.id, p)}
            quitar={quitarLiga}
            guardarId={guardarIdLiga}
            sinProveedor={{
              activo: s.variaPorReserva,
              cambiar: (si) => variaPorReserva(s.id, si),
              encender: "Varía por reserva",
              apagar: "Se reserva con proveedores fijos",
              texto:
                "Varía por reserva: no hay un proveedor fijo. En cada cotización se elige uno de Proveedores.",
              vacio:
                "Por definir. Se puede ligar un proveedor de Proveedores o crearlo aquí mismo; si cambia en cada reserva, se marca «Varía por reserva». Mientras tanto se cotiza igual.",
              avisoEncender: "Varía por reserva · el proveedor se elige en cada cotización",
              avisoApagar: "Se reserva con proveedores fijos",
              confirmar: {
                titulo: "¿Varía por reserva?",
                sub: "No queda un proveedor fijo; en cada cotización se elige uno de Proveedores.",
                nota: "Los proveedores siguen en Proveedores y se pueden elegir al cotizar.",
              },
            }}
          />
          <Bloque id="equipo" titulo="Para el equipo" soloEquipo>
            <fieldset disabled={!permisos.editar} className="contents">
              <AreaTexto
                key={version}
                etiqueta="Nota interna"
                id="servicio-notaInterna"
                name="notaInterna"
                form={FORM}
                defaultValue={s.notaInterna ?? ""}
                placeholder="Ej. Pedir nombre del chofer y placas por WhatsApp un día antes."
              />
            </fieldset>
          </Bloque>
        </div>
        <ColumnaServicio
          servicio={s}
          pide={pide}
          historial={historial}
          editado={editado}
          permisos={permisos}
          alAvisar={setAviso}
        />
      </div>
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} arriba={sucio} />
    </>
  );
}

function Formulario({
  servicio: s,
  ciudades,
  editable,
  sucio,
  alCambiar,
  alCambiarPide,
  alGuardar,
  alDescartar,
}: {
  servicio: Servicio;
  ciudades: OpcionCiudad[];
  editable: boolean;
  sucio: boolean;
  alCambiar: () => void;
  alCambiarPide: (p: string[]) => void;
  alGuardar: () => void;
  alDescartar: () => void;
}) {
  const tipo: TipoServicio = s.tipo;
  const [cobro, setCobro] = useState<ModeloCobro>(s.modeloCobro);
  const [descripcion, setDescripcion] = useState(s.descripcion ?? "");
  const [variantes, setVariantes] = useState<VarianteEditable[]>(() =>
    s.variantes.map((v) => ({
      clave: v.id,
      nombre: v.nombre,
      pasajeros: v.pasajeros?.toString() ?? "",
      maletas: v.maletas?.toString() ?? "",
      detalle: v.detalle ?? "",
    })),
  );
  const [estado, accion, pendiente] = useActionState(async (prev: ResultadoFicha, f: FormData) => {
    const r = await guardarFicha(s.id, prev, f);
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
    alCambiarPide(queSePide({ tipo, modeloCobro: cobro, variantes: variantes.length }));
  }, [tipo, cobro, variantes.length, alCambiarPide]);

  const v = VARIANTES[tipo];
  const traslado = tipo === "traslado";
  const sugerido = MODELO_SUGERIDO[tipo];

  return (
    <form
      id={FORM}
      onSubmit={enviarSinVaciar(accion)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
      className="flex min-w-0 flex-col gap-4"
    >
      <input type="hidden" name="modeloCobro" value={cobro} />
      <input
        type="hidden"
        name="variantes"
        value={JSON.stringify(
          variantes.map((x) => ({
            nombre: x.nombre,
            pasajeros: traslado ? x.pasajeros.trim() || null : null,
            maletas: traslado ? x.maletas.trim() || null : null,
            detalle: x.detalle,
          })),
        )}
      />

      <fieldset disabled={!editable} className="contents">
        <Bloque
          titulo="Lo que ve el cliente"
          muestra="En la propuesta"
          descripcion="El nombre y la descripción van en la propuesta tal cual."
        >
          <Campo etiqueta="Nombre" id="servicio-nombre" name="nombre" defaultValue={s.nombre} />

          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Tipo</span>
            <span className="inline-flex h-9 items-center self-start rounded-[10px] bg-suave px-3 text-[13.5px] font-semibold text-tinta-2">
              {nombreTipo(tipo)}
            </span>
            <p className="text-[12.5px] text-tinta-3">
              El tipo se elige al crear el servicio y ya no cambia: de él dependen cómo se llaman las variantes y lo
              que el armador pide al cotizar.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Campo
              etiqueta="Destino"
              id="servicio-destino"
              name="destino"
              defaultValue={s.destino}
              placeholder="Ej. Cancún y Riviera Maya"
              ayuda="Texto libre: una ciudad, una región o «Cualquier destino»."
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="servicio-ciudadId" className="text-[13px] font-semibold">
                Ciudad de la lista <span className="font-medium text-tinta-3">· opcional</span>
              </label>
              <select
                id="servicio-ciudadId"
                name="ciudadId"
                defaultValue={s.ciudadId ?? ""}
                className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              >
                <option value="">Cualquier ciudad</option>
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.detalle ? `${c.nombre}, ${c.detalle}` : c.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[12.5px] text-tinta-3">
                Con ciudad, el armador lo sugiere en los viajes a esa ciudad. Sin ciudad, aparece en todos.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <AreaTexto
              etiqueta="Descripción"
              id="servicio-descripcion"
              name="descripcion"
              value={descripcion}
              maxLength={400}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué es y qué incluye, como lo lee el cliente."
            />
            <p className="mt-1 text-right text-[12px] text-tinta-3">{descripcion.length} de 400</p>
          </div>
        </Bloque>

        <Bloque
          id="variantes"
          titulo={v.titulo}
          extra="Se elige al cotizar"
          descripcion={
            traslado
              ? "Los vehículos que se pueden cotizar, con cuántos pasajeros y maletas caben."
              : `Los ${v.varias} que se pueden cotizar; en cada cotización se elige uno. Los precios no van aquí.`
          }
        >
          {variantes.length ? (
            <table className="w-full table-fixed text-[13.5px]">
              <thead>
                <tr className="text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase">
                  <th className={`pb-1.5 ${traslado ? "w-[30%]" : "w-[34%]"}`}>{v.una}</th>
                  {traslado ? (
                    <>
                      <th className="w-[15%] pb-1.5">Pasajeros</th>
                      <th className="w-[15%] pb-1.5">Maletas</th>
                    </>
                  ) : null}
                  <th className="pb-1.5">{v.detalle}</th>
                  <th className="w-9" />
                </tr>
              </thead>
              <tbody>
                {variantes.map((x, i) => {
                  const poner = (y: Partial<VarianteEditable>) =>
                    cambiar(setVariantes)(variantes.map((z, j) => (j === i ? { ...z, ...y } : z)));
                  const nombre = x.nombre || `renglón ${i + 1}`;
                  return (
                    <tr key={x.clave}>
                      <td className="py-1 pr-2">
                        <input
                          aria-label={`Nombre, ${v.una} ${i + 1}`}
                          value={x.nombre}
                          onChange={(e) => poner({ nombre: e.target.value })}
                          placeholder={v.ejemplo}
                          className={ENTRADA}
                        />
                      </td>
                      {traslado ? (
                        <>
                          <td className="py-1 pr-2">
                            <input
                              aria-label={`Pasajeros, ${nombre}`}
                              inputMode="numeric"
                              value={x.pasajeros}
                              onChange={(e) => poner({ pasajeros: e.target.value })}
                              placeholder="Hasta"
                              className={`${ENTRADA} num`}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              aria-label={`Maletas, ${nombre}`}
                              inputMode="numeric"
                              value={x.maletas}
                              onChange={(e) => poner({ maletas: e.target.value })}
                              placeholder="Hasta"
                              className={`${ENTRADA} num`}
                            />
                          </td>
                        </>
                      ) : null}
                      <td className="py-1 pr-2">
                        <input
                          aria-label={`${v.detalle}, ${nombre}`}
                          value={x.detalle}
                          onChange={(e) => poner({ detalle: e.target.value })}
                          placeholder={v.ejemploDetalle}
                          className={ENTRADA}
                        />
                      </td>
                      <td className="py-1 text-right">
                        <button
                          type="button"
                          aria-label={`Quitar ${nombre}`}
                          onClick={() => cambiar(setVariantes)(variantes.filter((_, j) => j !== i))}
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
            <p className="text-[13px] text-tinta-3">Sin {v.varias} todavía.</p>
          )}
          {editable ? (
            <button
              type="button"
              onClick={() =>
                cambiar(setVariantes)([
                  ...variantes,
                  { clave: crypto.randomUUID(), nombre: "", pasajeros: "", maletas: "", detalle: "" },
                ])
              }
              className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
            >
              <IconoMas tam={15} /> Agregar {v.una}
            </button>
          ) : null}
        </Bloque>

        <Bloque
          id="cobro"
          titulo="Cómo se cobra"
          descripcion="Le dice al armador qué pedir para capturar el precio. Los precios no van aquí: se capturan en cada cotización."
        >
          <Opciones
            etiqueta="Cómo se cobra"
            opciones={MODELOS.map((m) => ({ valor: m.valor, etiqueta: m.nombre }))}
            elegidas={[cobro]}
            alCambiar={([m]) => cambiar(setCobro)(m)}
          />
          <p className="mt-2 text-[12.5px] text-tinta-3">
            {modelo(cobro).pista}
            {cobro !== sugerido
              ? ` Para ${nombreTipo(tipo).toLowerCase()} se suele cobrar «${modelo(sugerido).nombre.toLowerCase()}».`
              : ""}
          </p>
          <div className="mt-3">
            <Campo
              etiqueta="Cómo se calcula, en palabras"
              id="servicio-notaCobro"
              name="notaCobro"
              defaultValue={s.notaCobro ?? ""}
              placeholder="Ej. Mayores de 70 años cotizan aparte."
              ayuda="Opcional. Lo ve el equipo al cotizar."
            />
          </div>
        </Bloque>

        <Bloque titulo="Lo que recibe el cliente" muestra="Lo ve el cliente">
          <Campo
            etiqueta="El cliente recibe"
            id="servicio-clienteRecibe"
            name="clienteRecibe"
            defaultValue={s.clienteRecibe ?? ""}
            maxLength={120}
            placeholder="Ej. Datos del chofer un día antes"
            ayuda="Una línea; se lee en la lista y en el enlace del cliente."
          />
          <div className="mt-4">
            <AreaTexto
              etiqueta="En el viaje confirmado"
              id="servicio-enViajeConfirmado"
              name="enViajeConfirmado"
              defaultValue={s.enViajeConfirmado ?? ""}
              maxLength={600}
              placeholder="Qué ve el cliente en su viaje: cuándo aparece, qué datos lleva y a quién llamar."
            />
          </div>
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
