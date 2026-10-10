export type PermisosAerolinea = { editar: boolean; archivar: boolean; eliminar: boolean };

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Lo que dice el diálogo al archivar o reactivar una aerolínea. */
export const ARCHIVO = {
  archivar: [
    "Deja de aparecer al agregar vuelos en el armador.",
    "Los viajes y las cotizaciones que ya la usan no cambian.",
    "Se conservan sus tarifas, el check-in y la nota.",
  ],
  reactivar: {
    texto: "Vuelve a aparecer al agregar vuelos en el armador.",
    lista: ["Conviene revisar que las tarifas y el check-in sigan al día."],
  },
};

/** «vivaaerobus.com» a partir de lo que se haya escrito. */
export function urlSitio(sitio: string): string {
  return /^https?:\/\//i.test(sitio) ? sitio : `https://${sitio}`;
}
