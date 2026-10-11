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
import { formatoDia, sumarDias } from "@/lib/fechas";
import { tiemposDeVuelo } from "@/lib/revision";
import { horarioReal, leerNumeroVuelo, minutosEntre, nombreAeropuerto, textoDuracion, type Aeropuerto } from "@/lib/vuelos";
import { REGIMENES, nombreRegimen } from "@/lib/hoteles";
import { textoEdad } from "@/lib/actividades";
import { agregarHabitacionHotel, vueloConocido } from "./acciones";
import { CampoAeropuerto } from "./campo-aeropuerto";
import { CAJA, CampoHora, Etiqueta, OjoTachado, Paso, Segmentos } from "./piezas";

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
            min={p.fechaInicio ? sumarDias(p.fechaInicio, 1) : undefined}
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
                  { id: nuevoId(), habitacionId: r.id, cama: null, ...huespedesNuevaHabitacion(viaje, p.habitaciones) },
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

const LLEGA_DIAS = [
  { valor: "0", etiqueta: "Mismo día" },
  { valor: "1", etiqueta: "+1" },
  { valor: "2", etiqueta: "+2" },
];

export function EditorVuelo({
  p,
  ficha,
  viaje,
  aeropuertos,
  alConocerAeropuertos,
  alCambiar,
  alAvisar,
}: {
  p: PartidaArmador;
  ficha: FichaAerolineaArmador;
  viaje: Viaje;
  aeropuertos: Record<string, Aeropuerto>;
  alConocerAeropuertos: (a: Aeropuerto[]) => void;
  alCambiar: Cambiar;
  alAvisar: (t: string) => void;
}) {
  const redondo = p.detalle.redondo !== false;
  const tramo = (id: string, cambio: Partial<TramoArmador>) =>
    alCambiar({ tramos: p.tramos.map((t) => (t.id === id ? { ...t, ...cambio } : t)) });
  const tiempos = tiemposDeVuelo(p.tramos, aeropuertos);
  const sentidos = (redondo ? (["ida", "regreso"] as const) : (["ida"] as const)).map((s) => ({
    sentido: s,
    tramos: p.tramos.filter((t) => t.sentido === s),
  }));

  const agregarEscala = (sentido: "ida" | "regreso") => {
    const del = p.tramos.filter((t) => t.sentido === sentido);
    const ultimo = del.at(-1);
    const nuevo = {
      ...tramoVacio(sentido, ultimo?.fecha ? sumarDias(ultimo.fecha, ultimo.llegaDias) : sentido === "ida" ? viaje.inicio : viaje.fin),
      origen: ultimo?.destino ?? "",
    };
    // Las idas van antes que los regresos; dentro de cada sentido, en orden de vuelo.
    const ida = p.tramos.filter((t) => t.sentido === "ida");
    const regreso = p.tramos.filter((t) => t.sentido === "regreso");
    alCambiar({ tramos: sentido === "ida" ? [...ida, nuevo, ...regreso] : [...ida, ...regreso, nuevo] });
  };

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
                  ? [
                      ...ida,
                      ...(regreso.length
                        ? regreso
                        : [{ ...tramoVacio("regreso", viaje.fin), origen: ida.at(-1)?.destino ?? "", destino: ida[0]?.origen ?? "" }]),
                    ]
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

      {sentidos.map(({ sentido, tramos }) => {
        const titulo = sentido === "ida" ? "Ida" : "Regreso";
        const primero = tramos[0] ? horarioReal(tramos[0], aeropuertos) : null;
        const ultimo = tramos.at(-1) ? horarioReal(tramos.at(-1)!, aeropuertos) : null;
        const ruta = tramos.length ? [tramos[0].origen, ...tramos.map((t) => t.destino)].map((x) => x || "—").join(" → ") : "";
        const escalas = tramos.length - 1;
        return (
          <fieldset key={sentido} className="rounded-[12px] p-3 shadow-borde">
            <legend className="sr-only">{titulo}</legend>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[13px]">
              <b className="text-[14px]">{titulo}</b>
              <span className="num font-semibold text-tinta-2">{ruta}</span>
              <span className="text-tinta-3">
                · {escalas === 0 ? "Directo" : escalas === 1 ? "1 escala" : `${escalas} escalas`}
                {escalas > 0 && primero && ultimo && ultimo.llega > primero.sale
                  ? ` · ${textoDuracion(minutosEntre(primero.sale, ultimo.llega))} en total`
                  : ""}
              </span>
            </div>

            {tramos.map((t, i) => {
              const tiempo = tiempos[t.id];
              const nombre = `${sentido}${tramos.length > 1 ? ` tramo ${i + 1}` : ""}`;
              const numeroMal = !!t.numero.trim() && !leerNumeroVuelo(t.numero);
              return (
                <div key={t.id}>
                  {i > 0 ? (
                    <p
                      className={`my-2 flex items-center gap-2 text-[12px] ${tiempo?.conexion !== null && tiempo?.conexion !== undefined && tiempo.conexion <= 0 ? "font-semibold text-rojo" : "text-tinta-2"}`}
                    >
                      <span className="h-px flex-1 bg-linea" aria-hidden />
                      Conexión en {nombreAeropuerto(aeropuertos[t.origen], t.origen || "—")}
                      {tiempo?.conexion !== null && tiempo?.conexion !== undefined ? ` · ${textoDuracion(tiempo.conexion)}` : ""}
                      <span className="h-px flex-1 bg-linea" aria-hidden />
                    </p>
                  ) : null}
                  <div className="grid grid-cols-[120px_150px_1fr_auto] items-end gap-2.5">
                    <label>
                      <Etiqueta>{tramos.length > 1 ? `Tramo ${i + 1}` : "Número"}</Etiqueta>
                      <input
                        aria-label={`Número del vuelo de ${nombre}`}
                        aria-invalid={numeroMal || undefined}
                        value={t.numero}
                        placeholder={`${ficha.iata} 2124`}
                        onChange={(e) => tramo(t.id, { numero: e.target.value.toUpperCase() })}
                        onBlur={async () => {
                          const n = leerNumeroVuelo(t.numero);
                          if (n && n.texto !== t.numero) tramo(t.id, { numero: n.texto });
                          if (!n || t.sale) return;
                          const v = await vueloConocido(n.texto);
                          if (v) {
                            alConocerAeropuertos(v.aeropuertos);
                            tramo(t.id, { numero: n.texto, ...v.tramo });
                            alAvisar("Ruta y horario copiados de un vuelo ya capturado en otro viaje");
                          }
                        }}
                        className={`${CAJA} num font-semibold aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_var(--color-rojo)]`}
                      />
                    </label>
                    <label>
                      <Etiqueta>Fecha de salida</Etiqueta>
                      <input
                        type="date"
                        aria-label={`Fecha del vuelo de ${nombre}`}
                        value={t.fecha ?? ""}
                        onChange={(e) => tramo(t.id, { fecha: e.target.value || null })}
                        className={CAJA}
                      />
                    </label>
                    <p className="pb-2 text-[12px] text-tinta-3">
                      {t.origen !== t.destino && tiempo?.duracion !== null && tiempo?.duracion !== undefined && tiempo.duracion > 0 ? (
                        <>
                          Duración <b className="num font-semibold text-tinta">{textoDuracion(tiempo.duracion)}</b>
                        </>
                      ) : (
                        "La duración se calcula con la hora local de cada aeropuerto."
                      )}
                    </p>
                    {tramos.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => alCambiar({ tramos: p.tramos.filter((x) => x.id !== t.id) })}
                        className="cursor-pointer pb-2 text-[12.5px] font-semibold text-tinta-3 hover:text-rojo"
                      >
                        Quitar tramo
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                  <div className="mt-2.5 grid grid-cols-[1fr_104px_1fr_104px_150px] items-end gap-2.5">
                    <div>
                      <Etiqueta>Sale de</Etiqueta>
                      <CampoAeropuerto
                        etiqueta={`Origen del vuelo de ${nombre}`}
                        valor={t.origen}
                        aeropuerto={aeropuertos[t.origen]}
                        alElegir={(a) => {
                          if (a) alConocerAeropuertos([a]);
                          tramo(t.id, { origen: a?.iata ?? "" });
                        }}
                      />
                    </div>
                    <div>
                      <Etiqueta>Sale</Etiqueta>
                      <CampoHora etiqueta={`Hora de salida de ${nombre}`} valor={t.sale} alCambiar={(h) => tramo(t.id, { sale: h })} />
                    </div>
                    <div>
                      <Etiqueta>Llega a</Etiqueta>
                      <CampoAeropuerto
                        etiqueta={`Destino del vuelo de ${nombre}`}
                        valor={t.destino}
                        aeropuerto={aeropuertos[t.destino]}
                        alElegir={(a) => {
                          if (a) alConocerAeropuertos([a]);
                          tramo(t.id, { destino: a?.iata ?? "" });
                        }}
                      />
                    </div>
                    <div>
                      <Etiqueta>Llega</Etiqueta>
                      <CampoHora etiqueta={`Hora de llegada de ${nombre}`} valor={t.llega} alCambiar={(h) => tramo(t.id, { llega: h })} />
                    </div>
                    <div>
                      <Etiqueta ayuda="hora local">Día de llegada</Etiqueta>
                      <Segmentos
                        chico
                        etiqueta={`Día de llegada de ${nombre}`}
                        opciones={LLEGA_DIAS}
                        valor={String(t.llegaDias)}
                        alCambiar={(v) => tramo(t.id, { llegaDias: Number(v) })}
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-[150px_150px_1fr] items-center gap-2.5">
                    <input
                      aria-label={`Terminal de salida de ${nombre}`}
                      value={t.terminalSalida}
                      placeholder="Terminal de salida"
                      onChange={(e) => tramo(t.id, { terminalSalida: e.target.value })}
                      className={`${CAJA} h-8 text-[12.5px]`}
                    />
                    <input
                      aria-label={`Terminal de llegada de ${nombre}`}
                      value={t.terminalLlegada}
                      placeholder="Terminal de llegada"
                      onChange={(e) => tramo(t.id, { terminalLlegada: e.target.value })}
                      className={`${CAJA} h-8 text-[12.5px]`}
                    />
                    {t.llegaDias > 0 && t.fecha ? (
                      <span className="text-[12px] text-tinta-2">
                        Llega el {formatoDia(sumarDias(t.fecha, t.llegaDias))}{" "}
                        <span className="rounded-md bg-azul-tenue px-1.5 py-px text-[11px] font-bold text-azul-oscuro">
                          +{t.llegaDias}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            <div className="mt-2.5 flex items-center gap-3 border-t border-linea pt-2">
              <button
                type="button"
                disabled={p.tramos.length >= 12}
                onClick={() => agregarEscala(sentido)}
                className="cursor-pointer text-[12.5px] font-semibold text-azul-oscuro hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Agregar escala
              </button>
              <span className="text-[11.5px] text-tinta-3">
                El tramo nuevo sale del aeropuerto donde llega el anterior.
              </span>
            </div>
          </fieldset>
        );
      })}

      <p className="text-[11.5px] text-tinta-3">
        Sin API de vuelos: la ruta y el horario se capturan a mano, en la hora local de cada aeropuerto. Si el número ya se
        usó en otro viaje, se copian.
      </p>

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
    llegaDias: 0,
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
                      { id: nuevoId(), concepto: b.nombre.split(" ")[0], boletoId: b.id, cantidad: 1 },
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
      <p className="-mt-1.5 text-[11.5px] text-tinta-3">
        Los boletos dicen cuántas personas van; el costo neto total, a la derecha, cubre a todas.
        {ficha.boletos.length && viaje.menores > 0
          ? " Las edades vienen del catálogo: un menor que pasa la edad del boleto de niño cuenta como adulto."
          : ""}
      </p>

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
  const personas = p.detalle.personas ?? viaje.adultos + viaje.menores;

  const recoleccion = p.detalle.recoleccion ?? "redondo";
  const cambiarRecoleccion = (r: "ida" | "regreso" | "redondo") => {
    const ida = tramosVuelo.filter((t) => t.sentido === "ida").at(-1);
    const regreso = tramosVuelo.find((t) => t.sentido === "regreso");
    const actual = (desde: string) => p.trayectos.find((t) => t.desde.startsWith(desde));
    const trayectos = [];
    if (r !== "regreso")
      trayectos.push(
        actual("Aeropuerto") ?? { id: nuevoId(), desde: "Aeropuerto", hasta: "Hotel", fecha: viaje.inicio, hora: ida?.llega ?? null, vueloTramoId: ida?.id ?? null, vueloFecha: null, vueloHora: null },
      );
    if (r !== "ida")
      trayectos.push(
        actual("Hotel") ?? { id: nuevoId(), desde: "Hotel", hasta: "Aeropuerto", fecha: viaje.fin, hora: null, vueloTramoId: regreso?.id ?? null, vueloFecha: null, vueloHora: null },
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
                valor={personas}
                min={1}
                max={60}
                alCambiar={(n) => alCambiar({ detalle: { ...p.detalle, personas: n } })}
              />
            </div>
          ) : ficha.modeloCobro === "unidad" || ficha.modeloCobro === "dia" ? (
            <div>
              <Etiqueta>{ficha.modeloCobro === "dia" ? "Días" : "Cantidad"}</Etiqueta>
              <Paso
                etiqueta={ficha.modeloCobro === "dia" ? "Días" : "Cantidad"}
                valor={p.detalle.dias ?? 1}
                min={1}
                max={400}
                alCambiar={(n) => alCambiar({ detalle: { ...p.detalle, dias: n } })}
              />
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
