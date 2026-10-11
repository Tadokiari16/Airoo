import type { Actividad } from "./datos";

export type PermisosActividad = { editar: boolean; archivar: boolean; eliminar: boolean };

/** Lo que dice el diálogo al archivar o reactivar una actividad. */
export function textosArchivo(a: Pick<Actividad, "viajes">) {
  return {
    archivar: [
      "Deja de aparecer al buscar actividades en el armador.",
      a.viajes
        ? `Los ${a.viajes} viajes y las cotizaciones que ya la usan no cambian.`
        : "Los viajes y las cotizaciones que ya la usan no cambian.",
      "La ficha se conserva completa: fotos, bloques y proveedores ligados.",
    ],
    reactivar: {
      texto: "Vuelve a aparecer al buscar actividades en el armador.",
      lista: ["Se cotiza con la ficha tal como está; conviene revisar que siga al día."],
    },
  };
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Columna «Dónde se reserva» de la lista. */
export function textoDonde(a: Pick<Actividad, "sePagaEnLugar" | "ligados">) {
  if (a.sePagaEnLugar) return { titulo: "En el lugar", sub: "Lo paga el cliente", ambar: false };
  if (a.ligados.length === 0) return { titulo: "Sin proveedor", sub: "se cotiza igual", ambar: true };
  return {
    titulo: a.ligados.map((l) => l.proveedor).join(" · "),
    sub:
      a.ligados.length > 1
        ? `${a.ligados.length} opciones`
        : a.ligados[0].tipo === "plataforma"
          ? "Plataforma"
          : "Directo",
    ambar: false,
  };
}
