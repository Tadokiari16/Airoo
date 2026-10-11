"use client";

import { useState } from "react";
import { MARGENES } from "@/lib/armador";
import type { Hallazgo } from "@/lib/revision";
import { textoPorcentaje, type Pago, type Totales } from "@/lib/cotizacion";
import { formatoDinero } from "@/lib/dinero";
import { formatoDia } from "@/lib/fechas";
import { Interruptor } from "@/components/ui/interruptor";
import { IconoAviso, IconoCandado } from "@/components/iconos";
import { CAJA, OjoTachado, Segmentos } from "./piezas";

export type VistaOpcion = { id: string | null; nombre: string; totales: Totales; plan: Pago[]; falta: string | null };

export function TotalPorOpcion({
  vistas,
  elegida,
  alElegir,
  conIva,
  ivaPb,
}: {
  vistas: VistaOpcion[];
  elegida: string | null;
  alElegir: (id: string | null) => void;
  conIva: boolean;
  ivaPb: number;
}) {
  const [verPlan, setVerPlan] = useState(false);
  const v = vistas.find((x) => x.id === elegida) ?? vistas[0];
  const t = v.totales;
  const filas: [string, number][] = [
    ["Hospedaje", t.secciones.hospedaje],
    ["Vuelos", t.secciones.vuelos],
    ["Actividades", t.secciones.actividades],
    ["Servicios", t.secciones.servicios],
  ];
  return (
    <section aria-label="Total por opción" className="rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[14px] font-bold">{vistas.length > 1 ? "Total por opción" : "Total"}</h2>
        <span className="text-[11.5px] font-semibold text-tinta-3">MXN</span>
      </div>
      {vistas.length > 1 ? (
        <div className="mb-3">
          <Segmentos
            chico
            etiqueta="Opción"
            opciones={vistas.map((x) => ({ valor: x.id ?? "", etiqueta: x.nombre }))}
            valor={v.id ?? ""}
            alCambiar={(id) => alElegir(id || null)}
          />
        </div>
      ) : null}
      {v.falta ? (
        <div className="mb-3 rounded-[12px] bg-ambar-tenue p-3 text-[12.5px]">
          <b className="block font-semibold text-ambar">{v.falta}</b>
          <span className="text-tinta-2">Con el costo neto de cada servicio el total queda completo.</span>
        </div>
      ) : null}
      <p className="text-[12px] text-tinta-3">Total</p>
      <div className="flex items-baseline justify-between">
        <p className="num text-[28px] font-bold tracking-[-0.02em]">{formatoDinero(t.total)}</p>
        <p className="num text-[12px] text-tinta-3">{formatoDinero(t.porPersona)} p/p{t.bebes ? " sin contar bebés" : ""}</p>
      </div>
      <dl className="mt-2 flex flex-col text-[13px]">
        {filas.map(([e, m]) => (
          <div key={e} className="flex justify-between py-[3px]">
            <dt className="text-tinta-2">{e}</dt>
            <dd className="num">{formatoDinero(m)}</dd>
          </div>
        ))}
        <div className="flex justify-between py-[3px]">
          <dt className="text-tinta-2">Cargo por servicio</dt>
          <dd className="num">{formatoDinero(t.cargoServicio)}</dd>
        </div>
        <div className="mt-1 flex justify-between border-t border-linea pt-1.5 font-semibold">
          <dt>Subtotal</dt>
          <dd className="num">{formatoDinero(t.subtotal)}</dd>
        </div>
        {conIva ? (
          <div className="flex justify-between py-[3px]">
            <dt className="text-tinta-2">IVA {textoPorcentaje(ivaPb)}</dt>
            <dd className="num">{formatoDinero(t.iva)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 rounded-[12px] bg-suave p-3 text-[12.5px] shadow-borde">
        <div className="flex justify-between font-semibold">
          <span className="flex items-center gap-1">
            <IconoCandado tam={13} /> Pagos a Airoo
          </span>
          <span className="num">{formatoDinero(t.pagosAiroo)}</span>
        </div>
        {t.enDestino > 0 ? (
          <div className="mt-1 flex justify-between text-tinta-2">
            <span>En destino, al proveedor</span>
            <span className="num">{formatoDinero(t.enDestino)}</span>
          </div>
        ) : null}
        <div className="mt-1 flex justify-between text-tinta-2">
          <span>Plan de pagos</span>
          <button
            type="button"
            aria-expanded={verPlan}
            onClick={() => setVerPlan(!verPlan)}
            className="cursor-pointer font-semibold text-azul-oscuro hover:underline"
          >
            {v.plan.length === 1 ? "Pago único" : `${v.plan.length} pagos`} · {verPlan ? "ocultar" : "ver"}
          </button>
        </div>
        {verPlan ? (
          <ul className="mt-2 flex flex-col gap-1 border-t border-linea pt-2">
            {v.plan.map((p) => (
              <li key={p.concepto} className="flex justify-between">
                <span>
                  {p.concepto}
                  <span className="block text-[11.5px] text-tinta-3">
                    {p.vence ? `Vence ${formatoDia(p.vence)}` : "Al aprobar, en Datos y pago"}
                  </span>
                </span>
                <span className="num font-semibold">{formatoDinero(p.monto)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between rounded-[10px] bg-ambar-tenue px-2.5 py-2 text-[12.5px]">
        <span className="flex items-center gap-1 text-ambar">
          <OjoTachado /> Tu ganancia · solo tú la ves
        </span>
        <span className="num font-bold text-ambar">
          {t.completo
            ? `${formatoDinero(t.ganancia)} · ${textoPorcentaje(Math.round(t.gananciaPb / 10) * 10)} del subtotal`
            : "—"}
        </span>
      </div>
    </section>
  );
}

const COLOR = { error: "text-rojo", falta: "text-ambar", aviso: "text-tinta-2", observacion: "text-tinta-2" } as const;

function Renglon({ h, alIr }: { h: Hallazgo; alIr?: (h: Hallazgo) => void }) {
  return (
    <li className="flex items-start gap-1.5 text-[12.5px]">
      <span className={`mt-px shrink-0 ${h.nivel === "aviso" ? "text-ambar" : h.nivel === "observacion" ? "text-tinta-3" : COLOR[h.nivel]}`}>
        <IconoAviso tam={14} />
      </span>
      <span className={h.nivel === "aviso" || h.nivel === "observacion" ? "text-tinta-2" : `font-semibold ${COLOR[h.nivel]}`}>
        {h.texto}
        {alIr && h.partidaId ? (
          <button
            type="button"
            onClick={() => alIr(h)}
            className="ml-1 cursor-pointer font-normal whitespace-nowrap text-tinta-3 hover:text-azul-oscuro hover:underline"
          >
            · ir
          </button>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Lo que impide enviar (errores y datos que faltan) y, aparte, los avisos
 * (cosas raras que pueden estar bien) y las observaciones (datos neutros).
 * Ni los avisos ni las observaciones impiden enviar.
 */
export function AntesDeEnviar({ hallazgos, alIr }: { hallazgos: Hallazgo[]; alIr: (h: Hallazgo) => void }) {
  const bloquean = [...hallazgos.filter((h) => h.nivel === "error"), ...hallazgos.filter((h) => h.nivel === "falta")];
  const avisos = hallazgos.filter((h) => h.nivel === "aviso");
  const observaciones = hallazgos.filter((h) => h.nivel === "observacion");
  return (
    <section aria-label="Antes de enviar" className="rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta">
      <h2 className="flex items-center gap-2 text-[14px] font-bold">
        Antes de enviar
        {bloquean.length ? (
          <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ambar-tenue px-1.5 text-[11.5px] font-bold text-ambar">
            {bloquean.length}
          </span>
        ) : null}
      </h2>
      {bloquean.length ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {bloquean.map((h, i) => (
            <Renglon key={i} h={h} alIr={alIr} />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[12.5px] font-semibold text-verde">Todo listo para enviar</p>
      )}
      {avisos.length ? (
        <div aria-label="Avisos" role="group" className="mt-3 border-t border-linea pt-2.5">
          <p className="text-[12px] font-bold text-tinta-2">
            {avisos.length === 1 ? "1 aviso" : `${avisos.length} avisos`}
            <span className="font-normal text-tinta-3"> · no impiden enviar; vale la pena revisarlos</span>
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {avisos.map((h, i) => (
              <Renglon key={i} h={h} alIr={alIr} />
            ))}
          </ul>
        </div>
      ) : null}
      {observaciones.length ? (
        <div aria-label="Observaciones" role="group" className="mt-3 border-t border-linea pt-2.5">
          <p className="text-[12px] font-bold text-tinta-2">
            {observaciones.length === 1 ? "1 observación" : `${observaciones.length} observaciones`}
            <span className="font-normal text-tinta-3"> · no impiden enviar ni cambian los precios</span>
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {observaciones.map((h, i) => (
              <Renglon key={i} h={h} alIr={alIr} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Errores, avisos y observaciones dentro de la tarjeta de cada servicio. */
export function Hallazgos({ hallazgos }: { hallazgos: Hallazgo[] }) {
  if (!hallazgos.length) return null;
  const errores = hallazgos.filter((h) => h.nivel === "error");
  const avisos = hallazgos.filter((h) => h.nivel === "aviso");
  const observaciones = hallazgos.filter((h) => h.nivel === "observacion");
  return (
    <div className="mt-3 flex flex-col gap-2">
      {errores.length ? (
        <div role="alert" className="rounded-[12px] bg-rojo-tenue px-3 py-2.5">
          <p className="text-[12px] font-bold text-rojo">Impide enviar la cotización hasta corregirlo</p>
          <ul className="mt-1 flex flex-col gap-1">
            {errores.map((h, i) => (
              <Renglon key={i} h={h} />
            ))}
          </ul>
        </div>
      ) : null}
      {avisos.length ? (
        <div aria-label="Avisos del servicio" role="group" className="rounded-[12px] bg-ambar-tenue/60 px-3 py-2.5">
          <ul className="flex flex-col gap-1">
            {avisos.map((h, i) => (
              <Renglon key={i} h={h} />
            ))}
          </ul>
        </div>
      ) : null}
      {observaciones.length ? (
        <div aria-label="Observaciones del servicio" role="group" className="rounded-[12px] bg-suave/70 px-3 py-2.5">
          <ul className="flex flex-col gap-1">
            {observaciones.map((h, i) => (
              <Renglon key={i} h={h} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AjustesCotizacion({
  validaHasta,
  maxima,
  utilidadBasePb,
  conIva,
  ivaPb,
  alCambiar,
}: {
  validaHasta: string | null;
  maxima: string | null;
  utilidadBasePb: number;
  conIva: boolean;
  ivaPb: number;
  alCambiar: (c: { validaHasta?: string; utilidadBasePb?: number; conIva?: boolean }) => void;
}) {
  return (
    <section aria-label="Ajustes de la cotización" className="rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta">
      <h2 className="mb-2.5 text-[14px] font-bold">Ajustes de la cotización</h2>
      <label className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
        <span className="text-tinta-2">Válida hasta</span>
        <input
          type="date"
          aria-label="Válida hasta"
          value={validaHasta ?? ""}
          max={maxima ?? undefined}
          onChange={(e) => e.target.value && alCambiar({ validaHasta: e.target.value })}
          className={`${CAJA} w-[150px]`}
        />
      </label>
      {maxima ? (
        <p className="-mt-0.5 mb-1 text-[11.5px] text-tinta-3">
          Hasta el {formatoDia(maxima)}: el día antes de pagarle al primer hotel.
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
        <span className="text-tinta-2">Utilidad base</span>
        <div className="w-[190px]">
          <Segmentos
            chico
            etiqueta="Utilidad base"
            opciones={[...new Set([...MARGENES, utilidadBasePb])]
              .sort((a, b) => a - b)
              .map((m) => ({ valor: String(m), etiqueta: textoPorcentaje(m) }))}
            valor={String(utilidadBasePb)}
            alCambiar={(v) => alCambiar({ utilidadBasePb: Number(v) })}
          />
        </div>
      </div>
      <p className="-mt-0.5 mb-1 text-[11.5px] text-tinta-3">
        Se hereda en cada partida mientras no la cambies a mano. Los vuelos se quedan con su utilidad fija.
      </p>
      <div className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
        <span className="text-tinta-2">Agregar IVA {textoPorcentaje(ivaPb)} (solo si pide factura)</span>
        <Interruptor encendido={conIva} etiqueta="Agregar IVA" alCambiar={() => alCambiar({ conIva: !conIva })} />
      </div>
    </section>
  );
}
