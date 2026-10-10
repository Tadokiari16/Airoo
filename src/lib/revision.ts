// Lo que el armador revisa en cada servicio, sin acceso a la base.
//
// - error: lo capturado se contradice (origen igual a destino, llegada antes
//   de la salida…). No se guarda hasta corregirlo.
// - falta: dato que no está todavía (costo neto, fecha). Se guarda, pero la
//   cotización no se puede enviar.
// - aviso: algo raro que puede ser correcto (conexión corta, vuelo fuera de las
//   fechas del viaje). Se guarda y aparece en «Antes de enviar».
//
// Los textos describen qué pasa y por qué, sin órdenes (CLAUDE.md › Tono).

import { horaTexto, tipoCambioDe, type FixCotizacion, type PartidaArmador, type TramoArmador } from "./armador";
import { formatoDia, rangoCorto } from "./fechas";
import {
  enZona,
  horarioReal,
  leerNumeroVuelo,
  minutosEntre,
  nombreAeropuerto,
  textoDuracion,
  type Aeropuerto,
} from "./vuelos";

export type Nivel = "error" | "falta" | "aviso";
export type Hallazgo = { partidaId: string | null; nivel: Nivel; texto: string };

export type ContextoRevision = {
  viaje: { inicio: string; fin: string; adultos: number; menores: number; edadesMenores: number[] };
  hoy: string;
  fx: FixCotizacion;
  aeropuertos: Record<string, Aeropuerto | undefined>;
  /** Claves IATA de las aerolíneas del catálogo. */
  aerolineas: string[];
  /** Nombre corto de cada partida: «Seadust», «Xel-Há», «Vuelo VB». */
  nombres: Record<string, string>;
};

// Límites de los avisos de vuelo, en minutos.
export const LIMITES_VUELO = {
  duracionMinima: 30,
  duracionMaxima: 20 * 60,
  conexionMinima: 60,
  conexionMinimaInternacional: 90,
  conexionMaxima: 12 * 60,
};

const plural = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

/** Dónde empieza el servicio: la fecha contra la que se revisan pago y cancelación. */
export function inicioDelServicio(p: PartidaArmador): string | null {
  if (p.tipo === "vuelo") return [...p.tramos].map((t) => t.fecha).filter((f): f is string => !!f).sort()[0] ?? null;
  if (p.tipo === "servicio") {
    const t = p.trayectos.map((x) => x.fecha).filter((f): f is string => !!f).sort()[0];
    return t ?? p.fechaInicio;
  }
  return p.fechaInicio;
}

// ─── Una partida ────────────────────────────────────────────────────────────

/** Errores, faltas y avisos que dependen solo de esta partida. */
export function revisarPartida(p: PartidaArmador, ctx: ContextoRevision): Hallazgo[] {
  const salida: Hallazgo[] = [];
  const nombre = ctx.nombres[p.id] ?? "Un servicio";
  const error = (texto: string) => salida.push({ partidaId: p.id, nivel: "error", texto });
  const falta = (texto: string) => salida.push({ partidaId: p.id, nivel: "falta", texto });
  const aviso = (texto: string) => salida.push({ partidaId: p.id, nivel: "aviso", texto });
  const { viaje } = ctx;
  const personas = viaje.adultos + viaje.menores;
  const fueraDelViaje = (dia: string) => dia < viaje.inicio || dia > viaje.fin;
  const fechasViaje = rangoCorto(viaje.inicio, viaje.fin);

  // Costo neto total: uno por servicio, mayor a cero.
  if (p.netoTotal === null) falta(`${nombre} sin costo neto`);
  else if (!Number.isInteger(p.netoTotal) || p.netoTotal <= 0)
    error(`${nombre}: el costo neto total queda en $0. Se guarda cuando es mayor a cero.`);
  if (p.netoTotal !== null && p.moneda !== "MXN" && tipoCambioDe(p.moneda, ctx.fx) === null)
    falta(`${nombre} en ${p.moneda === "USD" ? "dólares" : "euros"} sin tipo de cambio`);

  // Fecha límite de pago y de cancelación: ni en el pasado ni después de que empieza el servicio.
  const inicio = inicioDelServicio(p);
  for (const [fecha, que] of [
    [p.pagarAntes, "La fecha límite de pago"],
    [p.cancelacionGratisHasta, "La cancelación gratuita"],
  ] as const) {
    if (!fecha) continue;
    if (fecha < ctx.hoy) error(`${nombre}: ${que.toLowerCase()} (${formatoDia(fecha)}) ya pasó.`);
    else if (inicio && fecha > inicio)
      error(`${nombre}: ${que.toLowerCase()} (${formatoDia(fecha)}) queda después de que empieza el servicio (${formatoDia(inicio)}).`);
  }

  if (p.tipo === "hotel") {
    if (p.fechaInicio && p.fechaFin && p.fechaFin <= p.fechaInicio)
      error(
        `${nombre}: la salida (${formatoDia(p.fechaFin)}) queda ${p.fechaFin === p.fechaInicio ? "el mismo día que" : "antes de"} la llegada (${formatoDia(p.fechaInicio)}). Una estancia lleva al menos una noche.`,
      );
    if (!p.fechaInicio || !p.fechaFin) falta(`${nombre} sin fechas`);
    if (p.habitaciones.length === 0) falta(`${nombre} sin habitaciones`);
    p.habitaciones.forEach((h, i) => {
      if (h.adultos + h.menores === 0) falta(`${nombre}: la habitación ${i + 1} no tiene huéspedes`);
    });
    const enHabitaciones = p.habitaciones.reduce((s, h) => s + h.adultos + h.menores, 0);
    if (p.habitaciones.length && enHabitaciones !== personas)
      aviso(`${nombre}: las habitaciones suman ${plural(enHabitaciones, "persona", "personas")} y en el viaje van ${personas}.`);
  }

  if (p.tipo === "actividad") {
    if (!p.fechaInicio) falta(`${nombre} sin fecha`);
    else if (fueraDelViaje(p.fechaInicio))
      aviso(`${nombre} queda el ${formatoDia(p.fechaInicio)}, fuera de las fechas del viaje (${fechasViaje}).`);
  }

  if (p.tipo === "servicio") {
    for (const t of p.trayectos)
      if (t.fecha && fueraDelViaje(t.fecha))
        aviso(`${nombre}: el trayecto ${t.desde} → ${t.hasta} queda el ${formatoDia(t.fecha)}, fuera de las fechas del viaje (${fechasViaje}).`);
  }

  if (p.tipo === "vuelo") salida.push(...revisarVuelo(p, ctx, nombre));
  return salida;
}

// ─── Vuelos ─────────────────────────────────────────────────────────────────

function revisarVuelo(p: PartidaArmador, ctx: ContextoRevision, nombre: string): Hallazgo[] {
  const salida: Hallazgo[] = [];
  const error = (texto: string) => salida.push({ partidaId: p.id, nivel: "error", texto });
  const falta = (texto: string) => salida.push({ partidaId: p.id, nivel: "falta", texto });
  const aviso = (texto: string) => salida.push({ partidaId: p.id, nivel: "aviso", texto });
  const { aeropuertos, viaje } = ctx;
  const personas = viaje.adultos + viaje.menores;
  const pasajeros = p.detalle.pasajeros ?? 0;
  if (pasajeros !== personas)
    aviso(`${nombre}: lleva ${plural(pasajeros, "pasajero", "pasajeros")} y en el viaje van ${personas}.`);

  const ap = (iata: string) => aeropuertos[iata];
  const lugar = (iata: string) => nombreAeropuerto(ap(iata), iata);
  const etiqueta = (t: TramoArmador) => leerNumeroVuelo(t.numero)?.texto ?? (t.sentido === "ida" ? "La ida" : "El regreso");
  let incompleto = false;

  for (const t of p.tramos) {
    const v = etiqueta(t);
    if (t.numero.trim()) {
      const n = leerNumeroVuelo(t.numero);
      if (!n)
        error(`«${t.numero.trim()}» no es un número de vuelo: lleva la clave de la aerolínea y de 1 a 4 dígitos, como VB 2124.`);
      else if (!ctx.aerolineas.includes(n.clave))
        error(`${n.texto}: la aerolínea ${n.clave} no está en el catálogo de Aerolíneas.`);
    }
    for (const iata of [t.origen, t.destino])
      if (iata && !ap(iata)) error(`${v}: el aeropuerto ${iata} no está en la lista de aeropuertos.`);
    if (t.origen && t.origen === t.destino) error(`${v} sale y llega al mismo aeropuerto, ${lugar(t.origen)}.`);
    if (!t.numero.trim() || !t.fecha || !t.sale || !t.llega || !t.origen || !t.destino) incompleto = true;

    const h = horarioReal(t, aeropuertos);
    if (!h || t.origen === t.destino) continue;
    const minutos = minutosEntre(h.sale, h.llega);
    if (minutos <= 0) {
      const o = ap(t.origen)!;
      const d = ap(t.destino)!;
      const llegaEnOrigen = enZona(h.llega, o.zonaHoraria);
      error(
        `${v}: la llegada queda antes de la salida. Llega a las ${horaTexto(t.llega)} en hora local de ${d.ciudad}, que son las ${horaTexto(llegaEnOrigen.hora)} en ${o.ciudad}, y sale a las ${horaTexto(t.sale)}. Si llega otro día, se marca «+1».`,
      );
      continue;
    }
    if (minutos < LIMITES_VUELO.duracionMinima)
      aviso(`${v} dura ${textoDuracion(minutos)}: es muy poco para un vuelo de ${lugar(t.origen)} a ${lugar(t.destino)}.`);
    if (minutos > LIMITES_VUELO.duracionMaxima)
      aviso(`${v} dura ${textoDuracion(minutos)}: pasa de 20 h. Puede faltar una escala o estar mal el día de llegada.`);
    const llegaDia = enZona(h.llega, ap(t.destino)!.zonaHoraria).dia;
    const fecha = t.fecha!;
    if (fecha < viaje.inicio || llegaDia > viaje.fin)
      aviso(`${v} vuela ${fecha === llegaDia ? `el ${formatoDia(fecha)}` : `del ${formatoDia(fecha)} al ${formatoDia(llegaDia)}`}, fuera de las fechas del viaje (${rangoCorto(viaje.inicio, viaje.fin)}).`);
  }
  if (incompleto) falta(`${nombre} sin horario completo`);

  // Tramos de un mismo sentido: cada uno sale de donde llegó el anterior.
  const sentidos = (["ida", "regreso"] as const).map((s) => p.tramos.filter((t) => t.sentido === s));
  for (const tramos of sentidos) {
    for (let i = 1; i < tramos.length; i++) {
      const antes = tramos[i - 1];
      const t = tramos[i];
      if (antes.destino && t.origen && antes.destino !== t.origen) {
        error(`${etiqueta(t)} sale de ${lugar(t.origen)}, pero ${etiqueta(antes)} llega a ${lugar(antes.destino)}.`);
        continue;
      }
      const a = horarioReal(antes, aeropuertos);
      const b = horarioReal(t, aeropuertos);
      if (!a || !b) continue;
      const conexion = minutosEntre(a.llega, b.sale);
      const internacional = [antes, t].some((x) => ap(x.origen)?.paisCodigo !== ap(x.destino)?.paisCodigo);
      const minima = internacional ? LIMITES_VUELO.conexionMinimaInternacional : LIMITES_VUELO.conexionMinima;
      if (conexion <= 0) error(`${etiqueta(t)} sale antes de que llegue ${etiqueta(antes)} a ${lugar(t.origen)}.`);
      else if (conexion < minima)
        aviso(
          `La conexión en ${lugar(t.origen)} es de ${textoDuracion(conexion)}. ${internacional ? "En un vuelo internacional" : "Entre dos vuelos"} se recomienda al menos ${textoDuracion(minima)}.`,
        );
      else if (conexion > LIMITES_VUELO.conexionMaxima)
        aviso(`La conexión en ${lugar(t.origen)} es de ${textoDuracion(conexion)}: pasa de 12 h.`);
    }
  }

  // Redondo: el regreso sale después de que llega la ida, y de donde llegó.
  const [ida, regreso] = sentidos;
  if (ida.length && regreso.length) {
    const ultimaIda = ida[ida.length - 1];
    const primerRegreso = regreso[0];
    const llegaIda = horarioReal(ultimaIda, aeropuertos);
    const saleRegreso = horarioReal(primerRegreso, aeropuertos);
    if (llegaIda && saleRegreso && saleRegreso.sale <= llegaIda.llega)
      error(`El regreso sale (${formatoDia(primerRegreso.fecha!)}, ${horaTexto(primerRegreso.sale)}) antes de que llegue la ida (${formatoDia(llegaIda.diaLlegada)}, ${horaTexto(ultimaIda.llega)}).`);
    if (ultimaIda.destino && primerRegreso.origen && ultimaIda.destino !== primerRegreso.origen)
      aviso(`El regreso sale de ${lugar(primerRegreso.origen)} y la ida llega a ${lugar(ultimaIda.destino)}.`);
    const ultimoRegreso = regreso[regreso.length - 1];
    if (ida[0].origen && ultimoRegreso.destino && ida[0].origen !== ultimoRegreso.destino)
      aviso(`El regreso llega a ${lugar(ultimoRegreso.destino)} y la ida sale de ${lugar(ida[0].origen)}.`);
  }
  return salida;
}

/** Duración de cada tramo y conexión con el anterior, para mostrarlas en el armador. */
export function tiemposDeVuelo(
  tramos: TramoArmador[],
  aeropuertos: Record<string, Aeropuerto | undefined>,
): Record<string, { duracion: number | null; conexion: number | null }> {
  const salida: Record<string, { duracion: number | null; conexion: number | null }> = {};
  for (const sentido of ["ida", "regreso"] as const) {
    const lista = tramos.filter((t) => t.sentido === sentido);
    lista.forEach((t, i) => {
      const h = horarioReal(t, aeropuertos);
      const antes = i > 0 ? horarioReal(lista[i - 1], aeropuertos) : null;
      salida[t.id] = {
        duracion: h ? minutosEntre(h.sale, h.llega) : null,
        conexion: h && antes ? minutosEntre(antes.llega, h.sale) : null,
      };
    });
  }
  return salida;
}

// ─── Toda la cotización ─────────────────────────────────────────────────────

/** Lo que se revisa entre servicios: hoteles contra vuelos, y que haya algo que enviar. */
export function revisarCotizacion(partidas: PartidaArmador[], ctx: ContextoRevision): Hallazgo[] {
  if (partidas.length === 0) return [{ partidaId: null, nivel: "falta", texto: "La cotización no tiene servicios" }];
  const salida: Hallazgo[] = [];
  const { viaje } = ctx;
  if (viaje.edadesMenores.length < viaje.menores)
    salida.push({
      partidaId: null,
      nivel: "falta",
      texto: viaje.menores === 1 ? "Falta la edad del menor" : "Faltan edades de los menores",
    });
  for (const p of partidas) salida.push(...revisarPartida(p, ctx));

  // La ida llega el día del check-in y el regreso sale el día del check-out.
  const hoteles = partidas.filter((p) => p.tipo === "hotel" && p.fechaInicio && p.fechaFin);
  const vuelo = partidas.find((p) => p.tipo === "vuelo");
  if (hoteles.length && vuelo) {
    const checkIn = hoteles.map((h) => h.fechaInicio!).sort()[0];
    const checkOut = hoteles.map((h) => h.fechaFin!).sort().at(-1)!;
    const ida = vuelo.tramos.filter((t) => t.sentido === "ida");
    const regreso = vuelo.tramos.filter((t) => t.sentido === "regreso");
    const llegada = ida.length ? horarioReal(ida[ida.length - 1], ctx.aeropuertos) : null;
    if (llegada && llegada.diaLlegada !== checkIn)
      salida.push({
        partidaId: vuelo.id,
        nivel: "aviso",
        texto: `La ida llega el ${formatoDia(llegada.diaLlegada)} y el check-in del hotel es el ${formatoDia(checkIn)}.`,
      });
    const sale = regreso[0]?.fecha;
    if (sale && regreso[0].sale && sale !== checkOut)
      salida.push({
        partidaId: vuelo.id,
        nivel: "aviso",
        texto: `El regreso sale el ${formatoDia(sale)} y el check-out del hotel es el ${formatoDia(checkOut)}.`,
      });
  }
  return salida;
}

/** Solo los errores: lo que impide guardar. */
export const erroresDe = (p: PartidaArmador, ctx: ContextoRevision) =>
  revisarPartida(p, ctx).filter((h) => h.nivel === "error");
