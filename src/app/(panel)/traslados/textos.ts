export type PermisosTraslado = { editar: boolean; archivar: boolean; eliminar: boolean };

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Lo que dice el diálogo al archivar o reactivar un tipo de unidad. */
export const ARCHIVO = {
  archivar: [
    "Deja de aparecer al agregar traslados en el armador.",
    "Los viajes y las cotizaciones que ya la usan no cambian.",
    "Se conservan su foto y su descripción.",
  ],
  reactivar: {
    texto: "Vuelve a aparecer al agregar traslados en el armador.",
    lista: ["Conviene revisar que la capacidad siga al día."],
  },
};
