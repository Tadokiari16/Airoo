// Cuántas veces se usa un registro de catálogo, en palabras.

export type UsosProveedor = { hoteles: number; actividades: number; servicios: number; viajes: number };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «está ligado a 3 hoteles y 1 actividad» */
export function describirUsos(u: UsosProveedor): string {
  const partes = [
    u.hoteles ? plural(u.hoteles, "hotel", "hoteles") : null,
    u.actividades ? plural(u.actividades, "actividad", "actividades") : null,
    u.servicios ? plural(u.servicios, "servicio", "servicios") : null,
  ].filter(Boolean) as string[];
  const ligado = partes.length
    ? "está ligado a " +
      (partes.length > 1 ? partes.slice(0, -1).join(", ") + " y " + partes.at(-1) : partes[0])
    : "";
  const viajes = u.viajes ? `se usó en ${plural(u.viajes, "viaje", "viajes")}` : "";
  return [ligado, viajes].filter(Boolean).join(" y ") || "no se ha usado";
}

export function totalUsos(u: UsosProveedor): number {
  return u.hoteles + u.actividades + u.servicios + u.viajes;
}
