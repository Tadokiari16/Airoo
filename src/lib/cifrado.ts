import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Números de cuenta (CLABE y tarjetas) cifrados con AES-256-GCM antes de
// guardarse. La llave vive solo en el servidor (LLAVE_CIFRADO, 32 bytes en
// base64); en producción se genera una nueva y no se comparte.

function llave(): Buffer {
  const b64 = process.env.LLAVE_CIFRADO;
  if (!b64) throw new Error("Falta LLAVE_CIFRADO en las variables de entorno");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("LLAVE_CIFRADO debe tener 32 bytes en base64");
  return k;
}

/** «v1.iv.etiqueta.texto», todo en base64. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", llave(), iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), datos.toString("base64")].join(".");
}

export function descifrar(guardado: string): string {
  const [v, iv, etiqueta, datos] = guardado.split(".");
  if (v !== "v1") throw new Error("Formato de cifrado desconocido");
  const d = createDecipheriv("aes-256-gcm", llave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(etiqueta, "base64"));
  return Buffer.concat([d.update(Buffer.from(datos, "base64")), d.final()]).toString("utf8");
}
