"use client";

import { horaTexto, nuevoId, type PartidaArmador, type TramoArmador, type TrayectoArmador } from "@/lib/armador";
import type { FichaTrasladoArmador } from "@/lib/armador-fichas";
import { formatoDia } from "@/lib/fechas";
import {
  avisosCapacidad,
  estadoLiga,
  ligar,
  momentoVuelo,
  proponerTrayectos,
  restarHoras,
  textoCapacidad,
  unidadSugerida,
} from "@/lib/traslados";
import type { Aeropuerto } from "@/lib/vuelos";
import { CAJA, CampoHora, Etiqueta, Paso, Segmentos } from "./piezas";

type Detalle = PartidaArmador["detalle"];

const MODOS = [
  { valor: "aeropuerto_hotel", etiqueta: "Aeropuerto–hotel" },
  { valor: "libre", etiqueta: "Libre" },
] as const;
const SERVICIOS = [
  { valor: "privado", etiqueta: "Privado" },
  { valor: "compartido", etiqueta: "Compartido" },
] as const;
const SENTIDOS = [
  { valor: "sencillo", etiqueta: "Sencillo" },
  { valor: "redondo", etiqueta: "Redondo" },
] as const;
const DIRECCIONES = [
  { valor: "llegada", etiqueta: "Llegada · aeropuerto → hotel" },
  { valor: "salida", etiqueta: "Salida · hotel → aeropuerto" },
] as const;

/**
 * Traslado: aeropuerto–hotel (propuesto con el vuelo y el hotel de la
 * cotización) o libre. En privado se elige la unidad; en compartido, no.
 */
export function EditorTraslado({
  p,
  unidades,
  viaje,
  tramosVuelo,
  hoteles,
  aeropuertos,
  llegarAntes,
  alCambiar,
}: {
  p: PartidaArmador;
  unidades: FichaTrasladoArmador[];
  viaje: { inicio: string; fin: string; adultos: number; menores: number };
  /** Tramos del vuelo de esta cotización. */
  tramosVuelo: TramoArmador[];
  hoteles: { llegada: string | null; salida: string | null };
  aeropuertos: Record<string, Aeropuerto>;
  llegarAntes: { nacional: number; internacional: number };
  alCambiar: (c: Partial<PartidaArmador>) => void;
}) {
  const d = p.detalle;
  const modo = d.modo ?? "aeropuerto_hotel";
  const servicio = d.servicio ?? "privado";
  const sentido = d.sentido ?? "redondo";
  const direccion = d.direccion ?? "llegada";
  const personas = d.personas ?? viaje.adultos + viaje.menores;
  const maletas = d.maletas ?? personas;
  const unidad = unidades.find((u) => u.id === p.trasladoUnidadId);
  const elegibles = unidades.filter((u) => !u.archivada || u.id === p.trasladoUnidadId);
  const tramos = Object.fromEntries(tramosVuelo.map((t) => [t.id, t]));
  const avisos = servicio === "privado" && unidad ? avisosCapacidad(unidad, personas, maletas) : [];

  const proponer = (c: Partial<Detalle>) => {
    const nuevo = { ...d, ...c };
    return proponerTrayectos({
      sentido: nuevo.sentido ?? "redondo",
      direccion: nuevo.direccion ?? "llegada",
      tramos: tramosVuelo,
      hoteles,
      ciudadDe: (iata) => aeropuertos[iata]?.ciudad,
      viaje,
      actuales: p.trayectos,
      nuevoId,
    });
  };

  const cambiarDetalle = (c: Partial<Detalle>) => {
    const nuevo = { ...d, ...c };
    if ((nuevo.modo ?? "aeropuerto_hotel") === "aeropuerto_hotel")
      return alCambiar({ detalle: nuevo, trayectos: proponer(c) });
    // Libre: los lugares se escriben a mano y el regreso es el mismo camino al revés.
    const [ida] = p.trayectos.map((t) => ligar(t, undefined));
    const primero = ida ?? vacio(viaje.inicio);
    const trayectos =
      nuevo.sentido === "redondo"
        ? [primero, { ...(p.trayectos[1] ? ligar(p.trayectos[1], undefined) : vacio(viaje.fin)), desde: primero.hasta, hasta: primero.desde }]
        : [primero];
    alCambiar({ detalle: nuevo, trayectos });
  };

  const cambiarTrayecto = (i: number, c: Partial<TrayectoArmador>) => {
    const trayectos = p.trayectos.map((t, j) => (j === i ? { ...t, ...c } : t));
    // En libre redondo, el regreso sigue al revés el camino de la ida.
    if (modo === "libre" && sentido === "redondo" && i === 0 && trayectos[1] && ("desde" in c || "hasta" in c))
      trayectos[1] = { ...trayectos[1], desde: trayectos[0].hasta, hasta: trayectos[0].desde };
    alCambiar({ trayectos });
  };

  const elegirServicio = (s: "privado" | "compartido") => {
    const sugerida = s === "privado" ? (unidad ?? unidadSugerida(unidades.filter((u) => !u.archivada), personas, maletas)) : null;
    alCambiar({ detalle: { ...d, servicio: s }, trasladoUnidadId: sugerida?.id ?? null });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <Etiqueta>Ruta</Etiqueta>
          <Segmentos etiqueta="Ruta" opciones={[...MODOS]} valor={modo} alCambiar={(m) => cambiarDetalle({ modo: m })} />
        </div>
        <div>
          <Etiqueta>Servicio</Etiqueta>
          <Segmentos etiqueta="Servicio" opciones={[...SERVICIOS]} valor={servicio} alCambiar={elegirServicio} />
        </div>
        <div>
          <Etiqueta>Viaje</Etiqueta>
          <Segmentos etiqueta="Viaje" opciones={[...SENTIDOS]} valor={sentido} alCambiar={(s) => cambiarDetalle({ sentido: s })} />
        </div>
      </div>
      {modo === "aeropuerto_hotel" && sentido === "sencillo" ? (
        <Segmentos
          etiqueta="Trayecto"
          chico
          opciones={[...DIRECCIONES]}
          valor={direccion}
          alCambiar={(x) => cambiarDetalle({ direccion: x })}
        />
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Etiqueta>Pasajeros</Etiqueta>
          <Paso
            etiqueta="Pasajeros"
            valor={personas}
            min={1}
            max={60}
            alCambiar={(n) => alCambiar({ detalle: { ...d, personas: n } })}
          />
        </div>
        <div>
          <Etiqueta>Maletas</Etiqueta>
          <Paso
            etiqueta="Maletas"
            valor={maletas}
            max={80}
            alCambiar={(n) => alCambiar({ detalle: { ...d, maletas: n } })}
          />
        </div>
        {servicio === "privado" ? (
          <label className="min-w-[240px] flex-1">
            <Etiqueta>Unidad</Etiqueta>
            <select
              aria-label="Unidad"
              value={p.trasladoUnidadId ?? ""}
              onChange={(e) => alCambiar({ trasladoUnidadId: e.target.value || null })}
              className={`${CAJA} ${p.trasladoUnidadId ? "" : "bg-ambar-tenue"}`}
            >
              <option value="">Sin elegir</option>
              {elegibles.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} · {u.pasajeros} pasajeros, {u.maletas} maletas
                  {u.archivada ? " · archivada" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="flex-1 pb-2 text-[12.5px] text-tinta-3">
            En compartido no se elige unidad: el viaje va con otros pasajeros.
          </p>
        )}
      </div>
      {servicio === "privado" && unidad ? (
        <p className={`-mt-1 text-[12.5px] ${avisos.length ? "font-semibold text-ambar" : "text-tinta-3"}`}>
          {avisos.length ? avisos.join(" ") : `${textoCapacidad(unidad)}: cabe el grupo.`}
        </p>
      ) : null}

      <div className="flex flex-col">
        {p.trayectos.map((t, i) => {
          const tramo = t.vueloTramoId ? tramos[t.vueloTramoId] : undefined;
          const estado = estadoLiga(t, tramos);
          const titulo =
            modo === "aeropuerto_hotel"
              ? tramo?.sentido === "regreso" || (sentido === "sencillo" ? direccion === "salida" : i === 1)
                ? "Salida"
                : "Llegada"
              : i === 0
                ? "Ida"
                : "Regreso";
          const espejo = modo === "libre" && sentido === "redondo" && i === 1;
          return (
            <div key={t.id} className="flex flex-col gap-2 border-t border-linea py-2.5 first:border-t-0 first:pt-0">
              <div className="grid grid-cols-[64px_minmax(0,1fr)_150px_120px] items-center gap-2.5">
                <b className="text-[13px]">{titulo}</b>
                <div className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                  <input
                    aria-label={`Desde, ${titulo.toLowerCase()}`}
                    value={t.desde}
                    disabled={espejo}
                    placeholder="Desde"
                    onChange={(e) => cambiarTrayecto(i, { desde: e.target.value })}
                    className={`${CAJA} h-8 min-w-0`}
                  />
                  <span aria-hidden>→</span>
                  <input
                    aria-label={`Hasta, ${titulo.toLowerCase()}`}
                    value={t.hasta}
                    disabled={espejo}
                    placeholder="Hasta"
                    onChange={(e) => cambiarTrayecto(i, { hasta: e.target.value })}
                    className={`${CAJA} h-8 min-w-0`}
                  />
                </div>
                <input
                  type="date"
                  aria-label={`Fecha, ${titulo.toLowerCase()}`}
                  value={t.fecha ?? ""}
                  onChange={(e) => cambiarTrayecto(i, { fecha: e.target.value || null })}
                  className={`${CAJA} ${t.fecha ? "" : "bg-ambar-tenue"}`}
                />
                <CampoHora
                  etiqueta={`Hora, ${titulo.toLowerCase()}`}
                  valor={t.hora}
                  alCambiar={(h) => cambiarTrayecto(i, { hora: h })}
                />
              </div>
              {estado === "cambio" && tramo ? (
                <PorRevisar
                  texto={textoCambio(tramo, t)}
                  usar={() => {
                    const m = momentoVuelo(tramo);
                    // En la llegada se toma la hora del vuelo; en la salida, la recogida se vuelve a escribir.
                    const nuevo = ligar(
                      { ...t, fecha: m.fecha ?? t.fecha, hora: tramo.sentido === "ida" ? m.hora : null },
                      tramo,
                    );
                    cambiarTrayecto(i, nuevo);
                  }}
                  dejar={() => cambiarTrayecto(i, ligar(t, tramo))}
                />
              ) : estado === "sin_vuelo" ? (
                <PorRevisar
                  texto="El vuelo del que salió este trayecto ya no está en la cotización."
                  usar={modo === "aeropuerto_hotel" && tramosVuelo.length ? () => alCambiar({ trayectos: proponer({}) }) : undefined}
                  etiquetaUsar="Proponer con el vuelo de ahora"
                  dejar={() => cambiarTrayecto(i, ligar(t, undefined))}
                  etiquetaDejar="Dejarlo sin vuelo"
                />
              ) : tramo ? (
                <p className="pl-[74px] text-[11.5px] text-tinta-3">{pistaVuelo(tramo, aeropuertos, llegarAntes)}</p>
              ) : modo === "aeropuerto_hotel" ? (
                <p className="pl-[74px] text-[11.5px] text-tinta-3">
                  Sin vuelo en la cotización: la fecha y la hora se escriben a mano, por ejemplo 745p.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <label className="flex items-center gap-2.5">
          <span className="text-[12.5px] font-semibold text-tinta-2">Duración aprox.</span>
          <input
            aria-label="Duración aproximada"
            value={d.duracionAprox ?? ""}
            placeholder="30–40 min"
            onChange={(e) => alCambiar({ detalle: { ...d, duracionAprox: e.target.value } })}
            className={`${CAJA} w-[120px]`}
          />
        </label>
        {modo === "aeropuerto_hotel" ? (
          <button
            type="button"
            onClick={() => alCambiar({ trayectos: proponer({}) })}
            className="cursor-pointer text-[12.5px] font-semibold text-azul-oscuro hover:underline"
          >
            Volver a proponer con el vuelo y el hotel
          </button>
        ) : null}
      </div>
    </div>
  );
}

const vacio = (fecha: string): TrayectoArmador => ({
  id: nuevoId(),
  desde: "",
  hasta: "",
  fecha,
  hora: null,
  vueloTramoId: null,
  vueloFecha: null,
  vueloHora: null,
});

function PorRevisar({
  texto,
  usar,
  dejar,
  etiquetaUsar = "Usar el horario nuevo",
  etiquetaDejar = "Dejar como está",
}: {
  texto: string;
  usar?: () => void;
  dejar: () => void;
  etiquetaUsar?: string;
  etiquetaDejar?: string;
}) {
  return (
    <div role="status" className="ml-[74px] flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[10px] bg-ambar-tenue px-3 py-2 text-[12.5px]">
      <span className="rounded-full bg-tarjeta px-2 py-px text-[11px] font-bold text-ambar">Por revisar</span>
      <span className="min-w-0 flex-1 text-tinta">{texto}</span>
      {usar ? (
        <button type="button" onClick={usar} className="cursor-pointer font-semibold text-azul-oscuro hover:underline">
          {etiquetaUsar}
        </button>
      ) : null}
      <button type="button" onClick={dejar} className="cursor-pointer font-semibold text-tinta-2 hover:underline">
        {etiquetaDejar}
      </button>
    </div>
  );
}

const momentoTexto = (fecha: string | null, hora: string | null) =>
  [fecha ? formatoDia(fecha) : "sin fecha", hora ? horaTexto(hora) : "sin hora"].join(", ");

/** «VB 2124 ahora llega el Mié 21 oct, 09:15 PM; el traslado se armó con Mié 21 oct, 08:45 PM.» */
function textoCambio(tramo: TramoArmador, t: TrayectoArmador): string {
  const m = momentoVuelo(tramo);
  const vuelo = tramo.numero.trim() || (tramo.sentido === "ida" ? "El vuelo de ida" : "El vuelo de regreso");
  const antes = t.vueloFecha || t.vueloHora
    ? `el traslado se armó con ${momentoTexto(t.vueloFecha, t.vueloHora)}`
    : "el traslado se armó antes de que el vuelo tuviera horario";
  return `${vuelo} ahora ${tramo.sentido === "ida" ? "llega" : "sale"} el ${momentoTexto(m.fecha, m.hora)}; ${antes}.`;
}

/** Lo que dice el vuelo ligado, como ayuda para la hora. */
function pistaVuelo(
  tramo: TramoArmador,
  aeropuertos: Record<string, Aeropuerto>,
  llegarAntes: { nacional: number; internacional: number },
): string {
  const vuelo = tramo.numero.trim() || "el vuelo";
  if (tramo.sentido === "ida")
    return tramo.llega ? `Llega ${vuelo} a las ${horaTexto(tramo.llega)}` : `${vuelo} todavía sin hora de llegada`;
  if (!tramo.sale) return `${vuelo} todavía sin hora de salida`;
  const o = aeropuertos[tramo.origen];
  const dest = aeropuertos[tramo.destino];
  const internacional = !!o && !!dest && o.paisCodigo !== dest.paisCodigo;
  const horas = internacional ? llegarAntes.internacional : llegarAntes.nacional;
  const llegar = restarHoras(tramo.sale, horas);
  const h = String(horas).replace(".5", "½");
  return `Sale ${vuelo} a las ${horaTexto(tramo.sale)} · ${internacional ? "internacional" : "nacional"}: llegar al aeropuerto a las ${horaTexto(llegar.hora)}${llegar.diaAntes ? " del día anterior" : ""} (${h} h antes). La recogida suma el tiempo de camino.`;
}
