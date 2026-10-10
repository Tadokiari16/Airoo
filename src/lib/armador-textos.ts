// Cómo se nombra y se describe cada partida en el viaje, en la lista y en
// «Antes de enviar». Sin precios: eso lo agrega quien puede verlos.

import type { PartidaArmador } from "./armador";
import type { FichaArmador } from "./armador-fichas";
import { noches } from "./cotizacion";
import { formatoDia, rangoCorto, rangoLargo } from "./fechas";
import { nombreRegimen } from "./hoteles";
import { horaTexto } from "./armador";

const NOMBRE_TIPO = { hotel: "Hotel", vuelo: "Vuelo", actividad: "Actividad", servicio: "Servicio" };
const GENERICAS = new Set(["hotel", "parque", "tour", "traslado", "seguro", "renta", "club", "casa", "hacienda", "villa", "hostal"]);

/** «Xel-Há · Todo incluido», «Vuelo redondo · VivaAerobus», «Traslado privado · Van adaptada». */
export function nombrePartida(p: PartidaArmador, f?: FichaArmador): string {
  if (!f) return NOMBRE_TIPO[p.tipo];
  if (f.tipo === "vuelo") return `${p.detalle.redondo === false ? "Vuelo sencillo" : "Vuelo redondo"} · ${f.nombre}`;
  if (f.tipo === "actividad") {
    const plan = f.planes.find((x) => x.id === p.planId);
    return plan ? `${f.nombre} · ${plan.nombre}` : f.nombre;
  }
  if (f.tipo === "servicio") {
    const v = f.variantes.find((x) => x.id === p.varianteId);
    return v ? `${f.nombre} · ${v.nombre}` : f.nombre;
  }
  return f.nombre;
}

/** Nombre corto para avisos y pestañas: «Seadust», «Xel-Há», «Parque Xcaret». */
export function nombreCorto(p: PartidaArmador, f?: FichaArmador): string {
  if (!f) return NOMBRE_TIPO[p.tipo];
  if (f.tipo === "vuelo") return `Vuelo ${f.iata}`;
  const palabras = f.nombre.split(/\s+/);
  const n = GENERICAS.has(palabras[0].toLowerCase()) ? 2 : 1;
  return palabras.slice(0, n).join(" ");
}

const plural = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

/** Las líneas que describen la partida en el Resumen del viaje. */
export function lineasPartida(p: PartidaArmador, f?: FichaArmador): string[] {
  if (p.tipo === "hotel") {
    const habs = p.habitaciones;
    const fechas =
      p.fechaInicio && p.fechaFin
        ? `${plural(noches(p.fechaInicio, p.fechaFin), "noche", "noches")} · ${rangoLargo(p.fechaInicio, p.fechaFin)}`
        : "";
    const primera = [p.regimen ? nombreRegimen(p.regimen) : "", fechas].filter(Boolean).join(" · ");
    const nombres = f?.tipo === "hotel" ? f.habitaciones : [];
    const nombreHab = (id: string) => nombres.find((h) => h.id === id)?.nombre ?? "Habitación";
    const iguales =
      habs.length > 1 &&
      habs.every(
        (h) =>
          h.habitacionId === habs[0].habitacionId &&
          h.cama === habs[0].cama &&
          h.adultos === habs[0].adultos &&
          h.menores === habs[0].menores,
      );
    const gente = (a: number, m: number) =>
      [a ? plural(a, "adulto", "adultos") : "", m ? plural(m, "menor", "menores") : ""].filter(Boolean).join(" + ");
    let segunda = "";
    if (iguales) {
      const h = habs[0];
      segunda = `${habs.length} ${nombreHab(h.habitacionId)}${h.cama ? ` con ${h.cama}` : ""} · ${gente(h.adultos, h.menores)} cada una`;
    } else if (habs.length) {
      segunda = habs
        .map((h) => `${nombreHab(h.habitacionId)}${h.cama ? ` (${h.cama})` : ""}${gente(h.adultos, h.menores) ? ` · ${gente(h.adultos, h.menores)}` : ""}`)
        .join(" · ");
    }
    return [primera, segunda].filter(Boolean);
  }
  if (p.tipo === "vuelo") {
    const tramos = p.tramos.map((t) =>
      [
        `${t.origen || "—"} → ${t.destino || "—"}`,
        t.numero,
        [t.fecha ? formatoDia(t.fecha) : "", t.sale ? horaTexto(t.sale) : ""].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · "),
    );
    const tarifa = f?.tipo === "vuelo" ? f.tarifas.find((t) => t.id === p.tarifaId) : undefined;
    const pax = p.detalle.pasajeros ? plural(p.detalle.pasajeros, "pasajero", "pasajeros") : "";
    return [...tramos, [pax, tarifa ? `tarifa ${tarifa.nombre}${tarifa.detalle ? `, ${tarifa.detalle}` : ""}` : ""].filter(Boolean).join(" · ")].filter(Boolean);
  }
  if (p.tipo === "actividad") {
    const personas = p.renglones.reduce((s, r) => s + r.cantidad, 0);
    return [
      [p.fechaInicio ? formatoDia(p.fechaInicio) : "Sin fecha", personas ? plural(personas, "persona", "personas") : "", p.detalle.duracion ?? ""]
        .filter(Boolean)
        .join(" · "),
    ];
  }
  // Servicio
  const trayectos = p.trayectos.map((t) => `${t.desde} → ${t.hasta}`).join(" · ");
  const fechas = p.fechaInicio && p.fechaFin ? rangoCorto(p.fechaInicio, p.fechaFin) : "";
  const personas = p.detalle.personas ? plural(p.detalle.personas, "persona", "personas") : "";
  const rec = p.detalle.recoleccion === "redondo" ? "redondo" : p.detalle.recoleccion === "ida" ? "solo ida" : p.detalle.recoleccion === "regreso" ? "solo regreso" : "";
  if (f?.tipo === "servicio" && f.tipoServicio === "traslado")
    return [[trayectos, rec, personas].filter(Boolean).join(" · ")].filter(Boolean);
  return [[personas, p.detalle.cobertura ?? "", fechas].filter(Boolean).join(" · ")].filter(Boolean);
}

export const SECCIONES = [
  { clave: "hospedaje", titulo: "Hospedaje", tipo: "hotel" },
  { clave: "vuelos", titulo: "Vuelos", tipo: "vuelo" },
  { clave: "actividades", titulo: "Actividades y excursiones", tipo: "actividad" },
  { clave: "servicios", titulo: "Servicios adicionales", tipo: "servicio" },
] as const;
export type ClaveSeccion = (typeof SECCIONES)[number]["clave"];
