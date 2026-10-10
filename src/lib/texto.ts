/** Minúsculas, sin acentos y sin espacios de más: «  Cancún » → «cancun». */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Quita espacios de más sin cambiar acentos ni mayúsculas. */
export function limpiar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

/** Iniciales para el círculo del avatar: «Asesora 1» → «A1», «Luis Pérez» → «LP». */
export function iniciales(nombre: string): string {
  const partes = limpiar(nombre).split(" ").filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}
