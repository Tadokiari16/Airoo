import type { Servicio } from "./datos";

export type PermisosServicio = { editar: boolean; archivar: boolean; eliminar: boolean };

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Lo que dice el diálogo al archivar o reactivar un servicio. */
export function textosArchivo(s: Pick<Servicio, "viajes">) {
  return {
    archivar: [
      "Deja de aparecer al buscar servicios en el armador.",
      s.viajes
        ? `Los ${s.viajes} viajes y las cotizaciones que ya lo usan no cambian.`
        : "Los viajes y las cotizaciones que ya lo usan no cambian.",
      "La ficha se conserva completa: variantes, textos y proveedores ligados.",
    ],
    reactivar: {
      texto: "Vuelve a aparecer al buscar servicios en el armador.",
      lista: ["Se cotiza con la ficha tal como está; conviene revisar que siga al día."],
    },
  };
}

/** Columna «Dónde se reserva» de la lista. */
export function textoDonde(s: Pick<Servicio, "variaPorReserva" | "ligados">) {
  const resto = "pago y cancelación, en cada reserva";
  if (s.variaPorReserva) return { titulo: "Varía por reserva", sub: resto, ambar: false };
  if (s.ligados.length === 0) return { titulo: "Por definir", sub: "Falta el proveedor", ambar: true };
  return { titulo: s.ligados.map((l) => l.proveedor).join(" · "), sub: resto, ambar: false };
}

/** Cómo llega lo que recibe el cliente: a los traslados se les sube al viaje. */
export const comoLlega = (s: Pick<Servicio, "tipo">) =>
  s.tipo === "traslado" ? "Se sube al viaje" : "En el enlace del cliente";
