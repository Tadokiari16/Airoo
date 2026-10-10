"use client";

import { useState } from "react";
import { huespedesNuevaHabitacion, noches, CAMAS } from "@/lib/cotizacion";
import { nuevoId, horaTexto, type PartidaArmador, type TramoArmador } from "@/lib/armador";
import type {
  FichaActividadArmador,
  FichaAerolineaArmador,
  FichaHotelArmador,
  FichaServicioArmador,
} from "@/lib/armador-fichas";
import { formatoDinero } from "@/lib/dinero";
import { REGIMENES, nombreRegimen } from "@/lib/hoteles";
import { textoEdad } from "@/lib/actividades";
import { agregarHabitacionHotel, vueloConocido } from "./acciones";
import { CAJA, CampoDinero, CampoHora, Etiqueta, OjoTachado, Paso, Segmentos } from "./piezas";

type Cambiar = (cambio: Partial<PartidaArmador>) => void;
type Viaje = { inicio: string; fin: string; adultos: number; menores: number };

// ─── Hotel ──────────────────────────────────────────────────────────────────

export function EditorHotel({
  p,
  ficha,
  viaje,
  alCambiar,
  alAvisar,
  alAgregarHabitacion,
}: {
  p: PartidaArmador;
  ficha: FichaHotelArmador;
  viaje: Viaje;
  alCambiar: Cambiar;
  alAvisar: (t: string) => void;
  alAgregarHabitacion: (h: { id: string; nombre: string }) => void;
}) {
  const [nuevaHab, setNuevaHab] = useState("");
  const regimenes = ficha.regimenes.length ? ficha.regimenes : REGIMENES.map((r) => r.clave);
  const n = p.fechaInicio && p.fechaFin ? noches(p.fechaInicio, p.fechaFin) : 0;
  const hab = (i: number, cambio: Partial<PartidaArmador["habitaciones"][number]>) =>
    alCambiar({ habitaciones: p.habitaciones.map((h, j) => (j === i ? { ...h, ...cambio } : h)) });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-[1fr_150px_150px] gap-2.5">
        <label>
          <Etiqueta>Régimen</Etiqueta>
          <select
            aria-label="Régimen"
            value={p.regimen ?? ""}
            onChange={(e) => alCambiar({ regimen: e.target.value || null })}
            className={CAJA}
          >
            {regimenes.map((r) => (
              <option key={r} value={r}>
                {nombreRegimen(r)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Etiqueta>Llegada</Etiqueta>
          <input
            type="date"
            aria-label="Llegada al hotel"
            value={p.fechaInicio ?? ""}
            onChange={(e) => alCambiar({ fechaInicio: e.target.value || null })}
            className={CAJA}
          />
        </label>
        <label>
          <Etiqueta ayuda={`${n} ${n === 1 ? "noche" : "noches"}`}>Salida</Etiqueta>
          <input
            type="date"
            aria-label="Salida del hotel"
            value={p.fechaFin ?? ""}
            min={p.fechaInicio ?? undefined}
            onChange={(e) => alCambiar({ fechaFin: e.target.value || null })}
            className={CAJA}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-[12px] shadow-borde">
        <table className="w-full text-[13px]">
          <thead className="bg-[#fafbfd] text-left text-[11.5px] font-bold tracking-[0.04em] text-tinta-3 uppercase">
            <tr>
              <th className="w-[62px] px-2.5 py-2">#</th>
              <th className="px-1.5 py-2">Habitación</th>
              <th className="w-[128px] px-1.5 py-2">Cama</th>
              <th className="w-[168px] px-1.5 py-2">Huéspedes</th>
              <th className="w-[124px] px-1.5 py-2">
                <span className="inline-flex items-center gap-1">
                  <OjoTachado /> Neto
                </span>
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {p.habitaciones.map((h, i) => {
              const sin = h.adultos + h.menores === 0;
              return (
                <tr key={h.id} className="border-t border-linea">
                  <td className="whitespace-nowrap px-2.5 py-2 text-tinta-3">Hab. {i + 1}</td>
                  <td className="px-1.5 py-2">
                    <select
                      aria-label={`Habitación ${i + 1}`}
                      value={h.habitacionId}
                      onChange={(e) => hab(i, { habitacionId: e.target.value })}
                      className={CAJA}
                    >
                      {ficha.habitaciones.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1.5 py-2">
                    <select
                      aria-label={`Cama de la habitación ${i + 1}`}
                      value={h.cama ?? ""}
                      onChange={(e) => hab(i, { cama: (e.target.value || null) as typeof h.cama })}
                      className={CAJA}
                    >
                      <option value="">Sin elegir</option>
                      {CAMAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <Paso
                        etiqueta={`Adultos de la habitación ${i + 1}`}
                        valor={h.adultos}
                        max={8}
                        alCambiar={(n) => hab(i, { adultos: n })}
                      />
                      {viaje.menores > 0 ? (
                        <Paso
                          etiqueta={`Menores de la habitación ${i + 1}`}
                          valor={h.menores}
                          max={6}
                          alCambiar={(n) => hab(i, { menores: n })}
                        />
                      ) : null}
                    </div>
                    {sin ? <p className="mt-1 text-[11.5px] font-semibold text-ambar">Asignar huéspedes</p> : null}
                  </td>
                  <td className="px-1.5 py-2">
                    <CampoDinero
                      etiqueta={`Neto de la habitación ${i + 1}`}
                      valor={h.neto}
                      moneda={p.moneda}
                      ambar
                      alCambiar={(c) => hab(i, { neto: c })}
                    />
                  </td>
                  <td className="pr-2 text-center">
                    <button
                      type="button"
                      aria-label={`Quitar habitación ${i + 1}`}
                      onClick={() => alCambiar({ habitaciones: p.habitaciones.filter((_, j) => j !== i) })}
                      className="cursor-pointer text-[16px] text-tinta-3 hover:text-rojo"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-linea px-3 py-2 text-center">
          {ficha.habitaciones.length ? (
            <button
              type="button"
              onClick={() => {
                const g = huespedesNuevaHabitacion(viaje, p.habitaciones);
                alCambiar({
                  habitaciones: [
                    ...p.habitaciones,
                    {
                      id: nuevoId(),
                      habitacionId: p.habitaciones.at(-1)?.habitacionId ?? ficha.habitaciones[0].id,
                      cama: p.habitaciones.at(-1)?.cama ?? null,
                      ...g,
                      neto: null,
                    },
                  ],
                });
              }}
              className="cursor-pointer text-[13px] font-semibold text-azul-oscuro hover:underline"
            >
              + Agregar habitación
            </button>
          ) : null}
          <form
            className={`${ficha.habitaciones.length ? "mt-2" : ""} flex items-center justify-center gap-2`}
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await agregarHabitacionHotel(ficha.id, nuevaHab);
              if ("error" in r) return alAvisar(r.error);
              setNuevaHab("");
              alAgregarHabitacion(r);
              alCambiar({
                habitaciones: [
                  ...p.habitaciones,
                  { id: nuevoId(), habitacionId: r.id, cama: null, ...huespedesNuevaHabitacion(viaje, p.habitaciones), neto: null },
                ],
              });
            }}
          >
            <input
              aria-label="Habitación nueva del hotel"
              value={nuevaHab}
              onChange={(e) => setNuevaHab(e.target.value)}
              placeholder={ficha.habitaciones.length ? "Otra habitación del hotel" : "Nombre de la habitación, como Suite Deluxe"}
              className={`${CAJA} max-w-[280px]`}
            />
            <button
              type="submit"
              disabled={nuevaHab.trim().length < 2}
              className="cursor-pointer text-[13px] font-semibold text-azul-oscuro disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar al hotel
            </button>
          </form>
          {!ficha.habitaciones.length ? (
            <p className="mt-1.5 text-[11.5px] text-tinta-3">
              Este hotel todavía no tiene habitaciones en su ficha; la que se escriba aquí queda guardada en el catálogo.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-ambar-tenue/60 px-3 py-2.5 shadow-borde">
        <label className="flex items-center gap-2 text-[13px] font-semibold">
          <input
            type="checkbox"
            checked={p.reembolsable}
            onChange={(e) =>
              alCambiar({ reembolsable: e.target.checked, cancelacionGratisHasta: e.target.checked ? p.cancelacionGratisHasta : null })
            }
            className="size-4 accent-[var(--color-azul)]"
          />
          Cancelación gratuita hasta
        </label>
        <input
          type="date"
          aria-label="Cancelación gratuita hasta"
          disabled={!p.reembolsable}
          value={p.cancelacionGratisHasta ?? ""}
          onChange={(e) => alCambiar({ cancelacionGratisHasta: e.target.value || null })}
          className={`${CAJA} w-[150px]`}
        />
        <span className="text-[13px] font-semibold">Pagar al proveedor a más tardar</span>
        <input
          type="date"
          aria-label="Pagar al proveedor a más tardar"
          value={p.pagarAntes ?? ""}
          onChange={(e) => alCambiar({ pagarAntes: e.target.value || null })}
          className={`${CAJA} w-[150px]`}
        />
        <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-tinta-3">
          <OjoTachado /> Solo tú lo ves
        </span>
        <p className="basis-full text-[11.5px] text-tinta-3">
          Las dos fechas son de la tarifa que se eligió y se guardan solo en esta reserva. Con cancelación gratis y fecha de
          pago, el hotel se le cobra al cliente en pagos flexibles.
        </p>
      </div>
    </div>
  );
}

// ─── Vuelo ──────────────────────────────────────────────────────────────────

export function EditorVuelo({
  p,
  ficha,
  viaje,
  alCambiar,
  alAvisar,
}: {
  p: PartidaArmador;
  ficha: FichaAerolineaArmador;
  viaje: Viaje;
  alCambiar: Cambiar;
  alAvisar: (t: string) => void;
}) {
  const redondo = p.detalle.redondo !== false;
  const tramo = (id: string, cambio: Partial<TramoArmador>) =>
    alCambiar({ tramos: p.tramos.map((t) => (t.id === id ? { ...t, ...cambio } : t)) });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[180px_1fr_140px] gap-2.5">
        <div>
          <Etiqueta>Viaje</Etiqueta>
          <Segmentos
            etiqueta="Tipo de vuelo"
            opciones={[
              { valor: "redondo", etiqueta: "Redondo" },
              { valor: "sencillo", etiqueta: "Sencillo" },
            ]}
            valor={redondo ? "redondo" : "sencillo"}
            alCambiar={(v) => {
              const r = v === "redondo";
              const ida = p.tramos.filter((t) => t.sentido === "ida");
              const regreso = p.tramos.filter((t) => t.sentido === "regreso");
              alCambiar({
                detalle: { ...p.detalle, redondo: r },
                tramos: r
                  ? [...ida, ...(regreso.length ? regreso : [tramoVacio("regreso", viaje.fin)])]
                  : ida,
              });
            }}
          />
        </div>
        <label>
          <Etiqueta>Tarifa</Etiqueta>
          <select
            aria-label="Tarifa"
            value={p.tarifaId ?? ""}
            onChange={(e) => alCambiar({ tarifaId: e.target.value || null })}
            className={CAJA}
          >
            <option value="">Sin tarifa del catálogo</option>
            {ficha.tarifas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
                {t.detalle ? ` · ${t.detalle}` : ""}
              </option>
            ))}
          </select>
        </label>
        <div>
          <Etiqueta>Pasajeros</Etiqueta>
          <Paso
            etiqueta="Pasajeros"
            valor={p.detalle.pasajeros ?? 0}
            min={1}
            max={60}
            alCambiar={(n) => alCambiar({ detalle: { ...p.detalle, pasajeros: n } })}
          />
        </div>
      </div>

      {p.tramos.map((t) => (
        <fieldset key={t.id} className="rounded-[12px] p-3 shadow-borde">
          <legend className="sr-only">{t.sentido === "ida" ? "Ida" : "Regreso"}</legend>
          <div className="grid grid-cols-[70px_150px_120px_1fr] items-end gap-2.5">
            <b className="pb-2 text-[14px]">{t.sentido === "ida" ? "Ida" : "Regreso"}</b>
            <label>
              <Etiqueta>Fecha</Etiqueta>
              <input
                type="date"
                aria-label={`Fecha del vuelo de ${t.sentido}`}
                value={t.fecha ?? ""}
                onChange={(e) => tramo(t.id, { fecha: e.target.value || null })}
                className={CAJA}
              />
            </label>
            <label>
              <Etiqueta>Número</Etiqueta>
              <input
                aria-label={`Número del vuelo de ${t.sentido}`}
                value={t.numero}
                placeholder={`${ficha.iata} 2124`}
                onChange={(e) => tramo(t.id, { numero: e.target.value.toUpperCase() })}
                onBlur={async () => {
                  if (!t.numero.trim() || t.sale) return;
                  const v = await vueloConocido(t.numero);
                  if (v) {
                    tramo(t.id, v);
                    alAvisar("Ruta y horario copiados de un vuelo ya capturado en otro viaje");
                  }
                }}
                className={`${CAJA} num font-semibold`}
              />
            </label>
            <p className="pb-2 text-[11.5px] text-tinta-3">
              Sin API de vuelos: la ruta y el horario se capturan a mano; si el número ya se usó en otro viaje, se copian.
            </p>
          </div>
          <div className="mt-2.5 grid grid-cols-[1fr_120px_110px_120px_1fr] items-end gap-2.5">
            <label>
              <Etiqueta>Sale de</Etiqueta>
              <input
                aria-label={`Origen del vuelo de ${t.sentido}`}
                value={t.origen}
                placeholder="Guadalajara (GDL)"
                onChange={(e) => tramo(t.id, { origen: e.target.value })}
                className={CAJA}
              />
            </label>
            <div>
              <Etiqueta>Sale</Etiqueta>
              <CampoHora etiqueta={`Hora de salida de ${t.sentido}`} valor={t.sale} alCambiar={(h) => tramo(t.id, { sale: h })} />
            </div>
            <label>
              <Etiqueta>Duración</Etiqueta>
              <input
                aria-label={`Duración del vuelo de ${t.sentido}`}
                value={t.duracion}
                placeholder="2 h 31 min"
                onChange={(e) => tramo(t.id, { duracion: e.target.value })}
                className={CAJA}
              />
            </label>
            <div>
              <Etiqueta>Llega</Etiqueta>
              <CampoHora etiqueta={`Hora de llegada de ${t.sentido}`} valor={t.llega} alCambiar={(h) => tramo(t.id, { llega: h })} />
            </div>
            <label>
              <Etiqueta>Llega a</Etiqueta>
              <input
                aria-label={`Destino del vuelo de ${t.sentido}`}
                value={t.destino}
                placeholder="Cancún (CUN)"
                onChange={(e) => tramo(t.id, { destino: e.target.value })}
                className={CAJA}
              />
            </label>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <div className="w-[220px]">
              <Segmentos
                chico
                etiqueta={`Escalas de ${t.sentido}`}
                opciones={[
                  { valor: "0", etiqueta: "Directo" },
                  { valor: "1", etiqueta: "Con escalas" },
                ]}
                valor={t.escalas ? "1" : "0"}
                alCambiar={(v) => tramo(t.id, { escalas: Number(v) })}
              />
            </div>
            <label className="flex items-center gap-1.5 text-[12.5px] text-tinta-2">
              <input
                type="checkbox"
                checked={t.llegaDiaSiguiente}
                onChange={(e) => tramo(t.id, { llegaDiaSiguiente: e.target.checked })}
                className="accent-[var(--color-azul)]"
              />
              Llega al día siguiente
            </label>
            <input
              aria-label={`Terminal de llegada de ${t.sentido}`}
              value={t.terminalLlegada}
              placeholder="Terminal de llegada"
              onChange={(e) => tramo(t.id, { terminalLlegada: e.target.value })}
              className={`${CAJA} w-[160px]`}
            />
          </div>
        </fieldset>
      ))}

      <label>
        <Etiqueta ayuda="importe ya pagado en el aeropuerto de salida; aparece en la confirmación de reserva">
          TUA informativa
        </Etiqueta>
        <input
          aria-label="TUA informativa"
          value={p.detalle.tua ?? ""}
          placeholder="GDL $727 · CUN $382"
          onChange={(e) => alCambiar({ detalle: { ...p.detalle, tua: e.target.value } })}
          className={CAJA}
        />
      </label>
    </div>
  );
}

export function tramoVacio(sentido: "ida" | "regreso", fecha: string): TramoArmador {
  return {
    id: nuevoId(),
    sentido,
    numero: "",
    fecha,
    origen: "",
    destino: "",
    terminalSalida: "",
    terminalLlegada: "",
    sale: null,
    llega: null,
    llegaDiaSiguiente: false,
    duracion: "",
    escalas: 0,
  };
}

// ─── Actividad ──────────────────────────────────────────────────────────────

export function EditorActividad({
  p,
  ficha,
  viaje,
  ocupadas,
  alCambiar,
}: {
  p: PartidaArmador;
  ficha: FichaActividadArmador;
  viaje: Viaje;
  /** Otras actividades del viaje por fecha, para avisar si se empalman. */
  ocupadas: Record<string, string>;
  alCambiar: Cambiar;
}) {
  const ren = (i: number, cambio: Partial<PartidaArmador["renglones"][number]>) =>
    alCambiar({ renglones: p.renglones.map((r, j) => (j === i ? { ...r, ...cambio } : r)) });
  const otra = p.fechaInicio ? ocupadas[p.fechaInicio] : undefined;
  const boletosLibres = ficha.boletos.filter((b) => !p.renglones.some((r) => r.boletoId === b.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[170px_1fr_1fr] gap-2.5">
        <label>
          <Etiqueta>Fecha</Etiqueta>
          <input
            type="date"
            aria-label="Fecha de la actividad"
            value={p.fechaInicio ?? ""}
            min={viaje.inicio}
            max={viaje.fin}
            onChange={(e) => alCambiar({ fechaInicio: e.target.value || null })}
            className={`${CAJA} ${p.fechaInicio ? "" : "bg-ambar-tenue"}`}
          />
          {!p.fechaInicio ? <span className="mt-1 block text-[11.5px] font-semibold text-ambar">Falta la fecha</span> : null}
          {otra ? <span className="mt-1 block text-[11.5px] text-ambar">Ese día ya tiene {otra}.</span> : null}
        </label>
        <label>
          <Etiqueta>Duración</Etiqueta>
          <input
            aria-label="Duración"
            value={p.detalle.duracion ?? ""}
            placeholder="Todo el día"
            onChange={(e) => alCambiar({ detalle: { ...p.detalle, duracion: e.target.value } })}
            className={CAJA}
          />
        </label>
        {ficha.planes.length ? (
          <label>
            <Etiqueta>Plan</Etiqueta>
            <select
              aria-label="Plan"
              value={p.planId ?? ""}
              onChange={(e) => alCambiar({ planId: e.target.value || null })}
              className={CAJA}
            >
              <option value="">Sin plan</option>
              {ficha.planes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span />
        )}
      </div>

      <div className="overflow-hidden rounded-[12px] shadow-borde">
        <table className="w-full text-[13px]">
          <thead className="bg-[#fafbfd] text-left text-[11.5px] font-bold tracking-[0.04em] text-tinta-3 uppercase">
            <tr>
              <th className="px-3 py-2">{ficha.boletos.length ? "Boleto" : "Concepto"}</th>
              <th className="w-[130px] px-1.5 py-2">Cantidad</th>
              <th className="w-[140px] px-1.5 py-2">
                <span className="inline-flex items-center gap-1">
                  <OjoTachado /> Neto c/u
                </span>
              </th>
              <th className="w-[110px] px-3 py-2 text-right">Subtotal</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {p.renglones.map((r, i) => {
              const b = ficha.boletos.find((x) => x.id === r.boletoId);
              return (
                <tr key={r.id} className="border-t border-linea">
                  <td className="px-3 py-2">
                    <b className="font-semibold">{r.concepto}</b>
                    {b ? <span className="block text-[11.5px] text-tinta-3">{textoEdad(b)}</span> : null}
                  </td>
                  <td className="px-1.5 py-2">
                    <Paso etiqueta={`Cantidad de ${r.concepto}`} valor={r.cantidad} max={60} alCambiar={(n) => ren(i, { cantidad: n })} />
                  </td>
                  <td className="px-1.5 py-2">
                    <CampoDinero
                      etiqueta={`Neto de ${r.concepto}`}
                      valor={r.netoUnitario}
                      moneda={p.moneda}
                      ambar
                      alCambiar={(c) => ren(i, { netoUnitario: c })}
                    />
                  </td>
                  <td className="num px-3 py-2 text-right font-semibold">
                    {r.netoUnitario !== null ? formatoDinero(r.netoUnitario * r.cantidad, p.moneda) : "—"}
                  </td>
                  <td className="pr-2 text-center">
                    {p.renglones.length > 1 ? (
                      <button
                        type="button"
                        aria-label={`Quitar ${r.concepto}`}
                        onClick={() => alCambiar({ renglones: p.renglones.filter((_, j) => j !== i) })}
                        className="cursor-pointer text-[16px] text-tinta-3 hover:text-rojo"
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {boletosLibres.length ? (
          <div className="flex flex-wrap gap-3 border-t border-linea px-3 py-2">
            {boletosLibres.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  alCambiar({
                    renglones: [
                      ...p.renglones,
                      { id: nuevoId(), concepto: b.nombre.split(" ")[0], boletoId: b.id, cantidad: 1, netoUnitario: b.gratis ? 0 : null },
                    ],
                  })
                }
                className="cursor-pointer text-[12.5px] font-semibold text-azul-oscuro hover:underline"
              >
                + {b.nombre}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {ficha.boletos.length && viaje.menores > 0 ? (
        <p className="-mt-1.5 text-[11.5px] text-tinta-3">
          Las edades vienen del catálogo: un menor que pasa la edad del boleto de niño cuenta como adulto.
        </p>
      ) : null}

      <label>
        <Etiqueta ayuda="el cliente lo ve en «Ver inclusiones»">Detalle de inclusiones</Etiqueta>
        <textarea
          aria-label="Detalle de inclusiones"
          rows={3}
          value={p.detalle.inclusiones ?? ""}
          onChange={(e) => alCambiar({ detalle: { ...p.detalle, inclusiones: e.target.value } })}
          className={`${CAJA} h-auto min-h-20 py-2 leading-snug`}
        />
      </label>
    </div>
  );
}

// ─── Servicio ───────────────────────────────────────────────────────────────

const RECOLECCION = [
  { valor: "ida", etiqueta: "Solo ida" },
  { valor: "regreso", etiqueta: "Solo regreso" },
  { valor: "redondo", etiqueta: "Redondo" },
] as const;

export function EditorServicio({
  p,
  ficha,
  viaje,
  tramosVuelo,
  alCambiar,
}: {
  p: PartidaArmador;
  ficha: FichaServicioArmador;
  viaje: Viaje;
  /** Tramos del vuelo de esta cotización, para ligar los traslados. */
  tramosVuelo: TramoArmador[];
  alCambiar: Cambiar;
}) {
  const traslado = ficha.tipoServicio === "traslado";
  const variante = ficha.variantes.find((v) => v.id === p.varianteId);
  const renglon = p.renglones[0];
  const cantidad = (n: number) =>
    alCambiar({ renglones: p.renglones.map((r, i) => (i === 0 ? { ...r, cantidad: n } : r)) });
  const personas = p.detalle.personas ?? viaje.adultos + viaje.menores;

  const recoleccion = p.detalle.recoleccion ?? "redondo";
  const cambiarRecoleccion = (r: "ida" | "regreso" | "redondo") => {
    const ida = tramosVuelo.find((t) => t.sentido === "ida");
    const regreso = tramosVuelo.find((t) => t.sentido === "regreso");
    const actual = (desde: string) => p.trayectos.find((t) => t.desde.startsWith(desde));
    const trayectos = [];
    if (r !== "regreso")
      trayectos.push(
        actual("Aeropuerto") ?? { id: nuevoId(), desde: "Aeropuerto", hasta: "Hotel", fecha: viaje.inicio, hora: ida?.llega ?? null, vueloTramoId: ida?.id ?? null },
      );
    if (r !== "ida")
      trayectos.push(
        actual("Hotel") ?? { id: nuevoId(), desde: "Hotel", hasta: "Aeropuerto", fecha: viaje.fin, hora: null, vueloTramoId: regreso?.id ?? null },
      );
    alCambiar({ detalle: { ...p.detalle, recoleccion: r }, trayectos });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2.5">
        <label>
          <Etiqueta>{traslado ? "Unidad" : "Plan o tipo"}</Etiqueta>
          <select
            aria-label={traslado ? "Unidad" : "Plan o tipo"}
            value={p.varianteId ?? ""}
            onChange={(e) => alCambiar({ varianteId: e.target.value || null })}
            className={CAJA}
          >
            <option value="">Sin elegir</option>
            {ficha.variantes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
                {v.pasajeros ? ` · hasta ${v.pasajeros}` : ""}
                {v.detalle ? ` · ${v.detalle}` : ""}
              </option>
            ))}
          </select>
        </label>
        {traslado && variante?.pasajeros ? (
          <p className={`pb-2 text-[12.5px] ${personas > variante.pasajeros ? "font-semibold text-ambar" : "text-tinta-3"}`}>
            {personas} de {variante.pasajeros} lugares
            {variante.maletas ? ` · ${variante.maletas} maletas` : ""}
          </p>
        ) : null}
      </div>

      {traslado ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <b className="text-[13px]">Recolección</b>
            <div className="w-[330px]">
              <Segmentos etiqueta="Recolección" opciones={[...RECOLECCION]} valor={recoleccion} alCambiar={cambiarRecoleccion} />
            </div>
          </div>
          {p.trayectos.map((t) => {
            const vuelo = tramosVuelo.find((x) => x.id === t.vueloTramoId);
            const cambiar = (c: Partial<typeof t>) =>
              alCambiar({ trayectos: p.trayectos.map((x) => (x.id === t.id ? { ...x, ...c } : x)) });
            return (
              <div key={t.id} className="grid grid-cols-[1fr_150px_120px_1fr] items-center gap-2.5 border-t border-linea pt-2.5">
                <div className="flex items-center gap-1.5 text-[12.5px]">
                  <input
                    aria-label="Desde"
                    value={t.desde}
                    onChange={(e) => cambiar({ desde: e.target.value })}
                    className={`${CAJA} h-8`}
                  />
                  →
                  <input
                    aria-label="Hasta"
                    value={t.hasta}
                    onChange={(e) => cambiar({ hasta: e.target.value })}
                    className={`${CAJA} h-8`}
                  />
                </div>
                <input
                  type="date"
                  aria-label={`Fecha de ${t.desde} a ${t.hasta}`}
                  value={t.fecha ?? ""}
                  onChange={(e) => cambiar({ fecha: e.target.value || null })}
                  className={CAJA}
                />
                <CampoHora etiqueta={`Hora de ${t.desde} a ${t.hasta}`} valor={t.hora} alCambiar={(h) => cambiar({ hora: h })} />
                <span className="text-[11.5px] text-tinta-3">
                  {vuelo
                    ? `${vuelo.sentido === "ida" ? "Llega" : "Sale"} ${vuelo.numero || "el vuelo"} · ${horaTexto(vuelo.sentido === "ida" ? vuelo.llega : vuelo.sale)}`
                    : "Escribe una hora, por ejemplo 745p"}
                </span>
              </div>
            );
          })}
          <label className="flex items-center gap-2.5">
            <span className="text-[12.5px] font-semibold text-tinta-2">Duración aprox.</span>
            <input
              aria-label="Duración aproximada"
              value={p.detalle.duracionAprox ?? ""}
              placeholder="30–40 min"
              onChange={(e) => alCambiar({ detalle: { ...p.detalle, duracionAprox: e.target.value } })}
              className={`${CAJA} w-[120px]`}
            />
          </label>
        </>
      ) : null}

      {!traslado ? (
        <div className="flex flex-wrap items-end gap-3">
          {ficha.modeloCobro === "persona" || ficha.modeloCobro === "persona_dia" ? (
            <div>
              <Etiqueta>Personas</Etiqueta>
              <Paso
                etiqueta="Personas"
                valor={renglon?.cantidad ?? 0}
                min={1}
                max={60}
                alCambiar={(n) => {
                  alCambiar({
                    detalle: { ...p.detalle, personas: n },
                    renglones: p.renglones.map((r, i) => (i === 0 ? { ...r, cantidad: n } : r)),
                  });
                }}
              />
            </div>
          ) : ficha.modeloCobro === "unidad" || ficha.modeloCobro === "dia" ? (
            <div>
              <Etiqueta>{ficha.modeloCobro === "dia" ? "Días" : "Cantidad"}</Etiqueta>
              <Paso etiqueta={ficha.modeloCobro === "dia" ? "Días" : "Cantidad"} valor={renglon?.cantidad ?? 1} min={1} max={400} alCambiar={cantidad} />
            </div>
          ) : null}
          {ficha.tipoServicio === "seguro" ? (
            <>
              <label>
                <Etiqueta>Cobertura</Etiqueta>
                <select
                  aria-label="Cobertura"
                  value={p.detalle.cobertura ?? "Nacional"}
                  onChange={(e) => alCambiar({ detalle: { ...p.detalle, cobertura: e.target.value } })}
                  className={`${CAJA} w-[150px]`}
                >
                  <option>Nacional</option>
                  <option>Internacional</option>
                </select>
              </label>
              <div>
                <Etiqueta>Mayores de 70</Etiqueta>
                <Paso
                  etiqueta="Mayores de 70"
                  valor={p.detalle.mayores70 ?? 0}
                  max={personas}
                  alCambiar={(n) => alCambiar({ detalle: { ...p.detalle, mayores70: n } })}
                />
              </div>
            </>
          ) : null}
          <label>
            <Etiqueta>Del</Etiqueta>
            <input
              type="date"
              aria-label="Desde"
              value={p.fechaInicio ?? ""}
              onChange={(e) => alCambiar({ fechaInicio: e.target.value || null })}
              className={`${CAJA} w-[150px]`}
            />
          </label>
          <label>
            <Etiqueta>Al</Etiqueta>
            <input
              type="date"
              aria-label="Hasta"
              value={p.fechaFin ?? ""}
              onChange={(e) => alCambiar({ fechaFin: e.target.value || null })}
              className={`${CAJA} w-[150px]`}
            />
          </label>
        </div>
      ) : null}
      {ficha.notaCobro ? <p className="text-[11.5px] text-tinta-3">{ficha.notaCobro}</p> : null}
    </div>
  );
}
