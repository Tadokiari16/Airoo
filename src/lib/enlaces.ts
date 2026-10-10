import { randomBytes } from "node:crypto";

// Enlaces del cliente y del pasajero (CLAUDE.md › Decisiones técnicas): el
// acceso es con un token aleatorio largo, nunca con el folio. El folio
// (AIR-2458) solo se muestra.

const BYTES = 32; // 256 bits de azar → 43 caracteres en base64url

/** Token nuevo para un enlace: «k8Fq2…», 43 caracteres [A-Za-z0-9_-]. */
export function generarToken(): string {
  return randomBytes(BYTES).toString("base64url");
}

/** Solo acepta tokens con la forma exacta de generarToken(); un folio no pasa. */
export function esTokenValido(texto: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(texto);
}

export function enlaceCliente(token: string, sitio = process.env.NEXT_PUBLIC_SITE_URL ?? ""): string {
  if (!esTokenValido(token)) throw new Error("El enlace del cliente se arma con un token, no con el folio");
  return `${sitio}/c/${token}`;
}

export function enlacePasajero(token: string, sitio = process.env.NEXT_PUBLIC_SITE_URL ?? ""): string {
  if (!esTokenValido(token)) throw new Error("El enlace del pasajero se arma con un token, no con el folio");
  return `${sitio}/p/${token}`;
}
