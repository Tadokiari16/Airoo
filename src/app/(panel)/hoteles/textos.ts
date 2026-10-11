import type { Hotel } from "./datos";

/** Lo que dice el diálogo al archivar o reactivar un hotel. */
export function textosArchivo(h: Pick<Hotel, "viajes">) {
  return {
    archivar: [
      "Deja de aparecer al buscar hoteles en el armador.",
      h.viajes
        ? `Los ${h.viajes} viajes y las cotizaciones que ya lo usan no cambian.`
        : "Los viajes y las cotizaciones que ya lo usan no cambian.",
      "La ficha se conserva completa: fotos y habitaciones.",
    ],
    reactivar: {
      texto: "Vuelve a aparecer al buscar hoteles en el armador.",
      lista: ["Se cotiza con la ficha tal como está; conviene revisar que siga al día."],
    },
  };
}
