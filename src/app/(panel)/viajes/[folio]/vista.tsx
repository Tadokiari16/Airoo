"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { BARRA, nombreEtapa, textoNoches, textoViajeros } from "@/lib/etapas";
import { formatoDinero } from "@/lib/dinero";
import { formatoDia, rangoLargo, diasEntre } from "@/lib/fechas";
import { textoPorcentaje } from "@/lib/cotizacion";
import { ligaWhatsApp } from "@/lib/whatsapp";
import { Boton } from "@/components/ui/boton";
import { Tarjeta } from "@/components/ui/tarjeta";
import { Insignia } from "@/components/ui/insignia";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import {
  IconoActividades,
  IconoAerolineas,
  IconoAtras,
  IconoCandado,
  IconoHoteles,
  IconoServicios,
  IconoTraslados,
  IconoWhatsapp,
} from "@/components/iconos";
import type { ItemResumen, ViajeCompleto } from "../datos";
import { cambiarACargo, guardarNotaInterna } from "../acciones";
import { AvatarACargo, Etiqueta } from "../piezas";

const ICONO = {
  hotel: IconoHoteles,
  vuelo: IconoAerolineas,
  actividad: IconoActividades,
  traslado: IconoTraslados,
  servicio: IconoServicios,
};

export function VistaViaje({ viaje: v, pestana }: { viaje: ViajeCompleto; pestana: "resumen" | "historial" }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const wa = v.whatsapp ? ligaWhatsApp(v.whatsapp) : null;
  const iEtapa = BARRA.findIndex((e) => e.valor === v.etapa);
  const borrador = v.cotizacion.estado === "borrador";
  const armador = `/viajes/${v.folio}/armador`;

  const pestanas: { clave: string; nombre: string; activa: boolean; href?: string; motivo?: string }[] = [
    { clave: "resumen", nombre: "Resumen", activa: pestana === "resumen", href: `/viajes/${v.folio}` },
    { clave: "validacion", nombre: "Validación", activa: false, motivo: `Disponible cuando ${v.clienteNombre} confirme su selección` },
    { clave: "reservas", nombre: "Reservas", activa: false, motivo: `Disponible cuando ${v.clienteNombre} pague el anticipo` },
    { clave: "documentos", nombre: "Documentos", activa: false, motivo: `Disponible cuando ${v.clienteNombre} pague el anticipo` },
    { clave: "pagos", nombre: "Pagos", activa: false, motivo: `Disponible cuando ${v.clienteNombre} pague el anticipo` },
    { clave: "historial", nombre: "Historial", activa: pestana === "historial", href: `/viajes/${v.folio}?p=historial` },
  ];

  return (
    <>
      <div className="mt-5 mb-3 flex items-center">
        <Link href="/viajes" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-tinta-2 hover:text-tinta">
          <IconoAtras tam={15} /> Viajes
        </Link>
      </div>

      <Tarjeta>
        <div className="flex flex-wrap items-start gap-4 px-4 pt-5 sm:px-[22px]">
          <div className="min-w-[260px] flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-bold tracking-[-0.02em]">{v.cliente}</h1>
              <span className="num rounded-md bg-fondo px-2 py-0.5 text-[12px] font-bold text-tinta-2">{v.folioTexto}</span>
              <Insignia tono={v.situacion.turno === "Airoo" ? "azul" : "gris"}>{nombreEtapa(v.etapa)}</Insignia>
              {v.ejemplo ? <Etiqueta>Ejemplo</Etiqueta> : null}
            </div>
            <p className="mt-1 text-[14.5px] text-tinta-2">
              {v.destino} · {rangoLargo(v.inicio, v.fin)} ({textoNoches(diasEntre(v.inicio, v.fin))}) ·{" "}
              {textoViajeros(v.adultos, v.menores)}
              {v.salida ? ` · sale de ${v.salida}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <AvatarACargo a={v.aCargo} />
              {v.puedeReasignar ? (
                <label className="relative flex flex-col text-[13px] leading-tight">
                  <b className="font-semibold">{v.aCargo?.nombre ?? "Sin asignar"}</b>
                  <span className="text-[12px] text-tinta-3">A cargo · cambiar</span>
                  <select
                    aria-label="A cargo"
                    value={v.aCargo?.id ?? ""}
                    disabled={pendiente}
                    onChange={(e) =>
                      iniciar(async () => {
                        const r = await cambiarACargo(v.id, e.target.value);
                        setAviso(r.error ?? "Se cambió quién atiende el viaje");
                      })
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    {v.equipo.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="flex flex-col text-[13px] leading-tight">
                  <b className="font-semibold">{v.aCargo?.nombre ?? "Sin asignar"}</b>
                  <span className="text-[12px] text-tinta-3">A cargo</span>
                </span>
              )}
            </div>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
              >
                <IconoWhatsapp tam={15} /> WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        <div className="px-4 pt-5 sm:px-[22px]" aria-label="Etapas del viaje">
          <ol className="grid grid-cols-3 gap-x-1.5 gap-y-3 sm:grid-cols-6">
            {BARRA.map((e, i) => (
              <li key={e.valor} className="flex flex-col gap-1.5">
                <span
                  className={`h-1 rounded-full ${i < iEtapa ? "bg-azul/45" : i === iEtapa ? "bg-azul" : "bg-gris"}`}
                />
                <span
                  aria-current={i === iEtapa ? "step" : undefined}
                  className={`text-[12px] ${i === iEtapa ? "font-bold text-tinta" : "text-tinta-3"}`}
                >
                  {e.nombre}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2.5 text-[13.5px]">
            <b className="font-bold">{nombreEtapa(v.etapa)}</b>{" "}
            <span className="text-tinta-2">{v.situacion.sub}</span>
          </p>
        </div>

        <nav aria-label="Secciones del viaje" className="mt-4 flex gap-6 overflow-x-auto border-t border-linea px-4 whitespace-nowrap sm:px-[22px]">
          {pestanas.map((p) =>
            p.href ? (
              <Link
                key={p.clave}
                href={p.href}
                aria-current={p.activa ? "page" : undefined}
                className={`py-3 text-[14px] font-semibold ${p.activa ? "text-tinta shadow-[inset_0_-2px_0_var(--color-azul)]" : "text-tinta-3 hover:text-tinta"}`}
              >
                {p.nombre}
              </Link>
            ) : (
              <span
                key={p.clave}
                title={p.motivo}
                aria-disabled="true"
                className="cursor-not-allowed py-3 text-[14px] font-semibold text-tinta-3/60"
              >
                {p.nombre}
              </span>
            ),
          )}
        </nav>
      </Tarjeta>

      {pestana === "historial" ? (
        <Tarjeta className="mt-4 px-[22px] py-5">
          <h2 className="mb-3 text-[17px] font-bold">Historial</h2>
          <ListaActividad eventos={v.actividad} completa />
        </Tarjeta>
      ) : (
        <>
          <Turno v={v} borrador={borrador} armador={armador} />
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-4">
              {v.secciones.length ? (
                v.secciones.map((s) => (
                  <Tarjeta key={s.clave} className="px-[18px] py-4">
                    <h2 className="mb-1 text-[17px] font-bold">{s.titulo}</h2>
                    <ul>
                      {s.items.map((it) => (
                        <Item key={it.id} it={it} />
                      ))}
                    </ul>
                  </Tarjeta>
                ))
              ) : (
                <Tarjeta className="px-[18px] py-8 text-center">
                  <p className="text-[15px] font-semibold">Todavía no tiene servicios</p>
                  <p className="mx-auto mt-1 max-w-md text-tinta-2">
                    Hospedaje, vuelos, actividades y servicios se agregan en el armador, con su costo neto y la utilidad de
                    Airoo.
                  </p>
                </Tarjeta>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <Tarjeta className="px-[18px] py-4">
                <Cabeza titulo={`Pagos de ${v.clienteNombre}`}>
                  {v.total !== null ? (
                    <span className="num text-[13px] text-tinta-2">Total {formatoDinero(v.total)}</span>
                  ) : null}
                </Cabeza>
                {v.totalCon ? <p className="text-[12.5px] text-tinta-3">Con {v.totalCon}</p> : null}
                <p className="mt-1 text-[13.5px] text-tinta-2">
                  Todavía no paga. En Datos y pago va a elegir entre flexible o de contado.
                </p>
              </Tarjeta>

              <Tarjeta className="px-[18px] py-4">
                <Cabeza titulo="Viajeros">
                  <span className="text-[13px] text-tinta-3">{textoViajeros(v.adultos, v.menores)}</span>
                </Cabeza>
                <p className="text-[13.5px] text-tinta-2">
                  Se capturan en Datos y pago. Por ahora solo está {v.clienteNombre}, quien cotiza.
                </p>
                {v.menores ? (
                  <p className="mt-1.5 text-[12.5px] text-tinta-3">
                    {v.edadesMenores.length
                      ? `Edades de los menores: ${v.edadesMenores.join(", ")} años`
                      : "Faltan las edades de los menores"}
                  </p>
                ) : null}
              </Tarjeta>

              {v.dinero ? <TarjetaDinero d={v.dinero} /> : null}

              <TarjetaActividad v={v} alAvisar={setAviso} />
            </div>
          </div>
        </>
      )}
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}

function Turno({ v, borrador, armador }: { v: ViajeCompleto; borrador: boolean; armador: string }) {
  if (v.etapa !== "cotizacion") return null;
  const deAiroo = borrador;
  return (
    <section
      aria-label={deAiroo ? "Turno de Airoo" : "Con el cliente"}
      className={`mt-4 flex flex-wrap items-center gap-4 rounded-tarjeta px-5 py-4 ${deAiroo ? "bg-azul-tenue" : "bg-tarjeta shadow-borde"}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[11.5px] font-bold tracking-[0.08em] uppercase ${deAiroo ? "text-azul-oscuro" : "text-tinta-3"}`}>
          {deAiroo ? "Turno de Airoo" : "Con el cliente"}
        </p>
        <p className="mt-0.5 text-[15px] font-bold">
          {deAiroo
            ? `Cotización en borrador${v.cotizacion.version > 1 ? ` · versión ${v.cotizacion.version}` : ""}`
            : `${v.clienteNombre} tiene la cotización${v.cotizacion.validaHasta ? ` · vale hasta el ${formatoDia(v.cotizacion.validaHasta)}` : ""}`}
        </p>
        <p className="text-[13px] text-tinta-2">
          {deAiroo
            ? v.cotizacion.opciones
              ? `${v.cotizacion.opciones} opciones de hotel para comparar. Cuando esté completa se revisa y se envía.`
              : "Cuando esté completa se revisa y se envía por WhatsApp."
            : "Cuando la abra se verá aquí qué secciones revisó."}
        </p>
      </div>
      {deAiroo && v.puedeEditar ? (
        <Link
          href={armador}
          className="inline-flex h-10 items-center rounded-campo bg-tinta px-4 text-sm font-semibold text-white hover:bg-tinta/90"
        >
          Abrir armador
        </Link>
      ) : null}
    </section>
  );
}

function Item({ it }: { it: ItemResumen }) {
  const Icono = ICONO[it.tipo];
  return (
    <li className="flex gap-3.5 border-t border-linea py-3.5 first:border-t-0">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-azul-tenue text-azul-oscuro">
        <Icono tam={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
          {it.nombre}
          {it.opcion ? <Insignia tono={it.recomendada ? "azul" : "gris"}>{it.opcion}{it.recomendada ? " · recomendada" : ""}</Insignia> : null}
        </p>
        {it.lineas.map((l, i) => (
          <p key={i} className="text-[13px] text-tinta-2">
            {l}
          </p>
        ))}
      </div>
      <div className="shrink-0 text-right">
        {it.precio !== null ? (
          <p className="num text-[15px] font-bold">{formatoDinero(it.precio)}</p>
        ) : (
          <p className="text-[13px] font-semibold text-ambar">Sin costo neto</p>
        )}
        {it.proveedor ? <p className="text-[12.5px] text-tinta-3">{it.proveedor}</p> : null}
      </div>
    </li>
  );
}

function Cabeza({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <h2 className="text-[16px] font-bold">{titulo}</h2>
      {children}
    </div>
  );
}

function Renglon({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13.5px]">
      <span className="text-tinta-2">{etiqueta}</span>
      <span className={`num ${fuerte ? "font-bold" : "font-semibold"}`}>{valor}</span>
    </div>
  );
}

function TarjetaDinero({ d }: { d: NonNullable<ViajeCompleto["dinero"]> }) {
  return (
    <Tarjeta className="px-[18px] py-4">
      <Cabeza titulo="Dinero">
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-tinta-3">
          <IconoCandado tam={13} /> Solo el equipo a cargo
        </span>
      </Cabeza>
      {d.con ? <p className="-mt-1 mb-1 text-[12.5px] text-tinta-3">Con {d.con}</p> : null}
      <Renglon etiqueta="Venta" valor={formatoDinero(d.venta)} />
      <Renglon etiqueta="Proveedores" valor={formatoDinero(d.proveedores)} />
      <div className="mt-1 border-t border-linea pt-1">
        <Renglon
          etiqueta="Utilidad"
          valor={`${formatoDinero(d.utilidad)} · ${textoPorcentaje(Math.round(d.utilidadPb / 10) * 10)}`}
          fuerte
        />
        {d.comision ? (
          <>
            <Renglon etiqueta={`Comisión de Airoo (${d.comision.porcentaje}%)`} valor={formatoDinero(d.comision.airoo)} />
            <Renglon etiqueta="Para la asesora" valor={formatoDinero(d.comision.asesora)} />
          </>
        ) : null}
      </div>
      {!d.completo ? (
        <p className="mt-1.5 text-[12.5px] text-ambar">Falta el costo neto de algún servicio; las cifras van a cambiar.</p>
      ) : null}
    </Tarjeta>
  );
}

function TarjetaActividad({ v, alAvisar }: { v: ViajeCompleto; alAvisar: (t: string) => void }) {
  const [nota, setNota] = useState("");
  const [guardando, iniciar] = useTransition();
  return (
    <Tarjeta className="px-[18px] py-4">
      <Cabeza titulo="Actividad">
        <Link href={`/viajes/${v.folio}?p=historial`} className="text-[13px] font-semibold text-azul-oscuro hover:underline">
          Historial completo
        </Link>
      </Cabeza>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await guardarNotaInterna(v.id, nota);
            if (r.error) alAvisar(r.error);
            else {
              setNota("");
              alAvisar("Nota interna guardada · no se le avisa al cliente");
            }
          });
        }}
      >
        <input
          aria-label="Nota interna para el equipo"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota interna para el equipo…"
          className="h-10 min-w-0 flex-1 rounded-campo bg-tarjeta px-3 text-[13.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
        />
        <Boton variante="secundario" type="submit" className="h-10" disabled={guardando || nota.trim().length < 2}>
          Guardar
        </Boton>
      </form>
      <ListaActividad eventos={v.actividad.slice(0, 6)} />
    </Tarjeta>
  );
}

function ListaActividad({ eventos, completa }: { eventos: ViajeCompleto["actividad"]; completa?: boolean }) {
  if (!eventos.length) return <p className="text-[13.5px] text-tinta-2">Sin actividad todavía.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {eventos.map((e) => (
        <li key={e.id} className="flex gap-2.5 text-[13.5px]">
          <span
            className={`mt-1.5 size-[7px] shrink-0 rounded-full ${e.tipo === "nota" ? "bg-ambar" : e.tipo === "cliente" ? "bg-verde" : "bg-azul"}`}
          />
          <div className="min-w-0">
            <b className="font-semibold">{e.texto}</b>
            <span className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-tinta-3">
              {e.cuando}
              {completa && e.quien ? <> · {e.quien}</> : null}
              {e.etiqueta ? (
                <>
                  {" · "}
                  <b className="font-semibold text-tinta-2">{e.etiqueta}</b>
                </>
              ) : null}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
