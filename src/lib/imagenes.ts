import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { borrarArchivos, guardarArchivo, urlArchivo } from "@/lib/almacen";

// Cada foto se guarda en dos tamaños webp: grande (hasta 2400 px, para la
// portada y la galería abierta) y chica (600 px, para listas y miniaturas).

const GRANDE = 2400;
const CHICA = 600;
/** El navegador ya las reduce antes de subirlas; esto es el tope del servidor. */
export const MAX_BYTES = 12 * 1024 * 1024;

export type FotoProcesada = { archivo: string; ancho: number; alto: number };

export async function procesarFoto(carpeta: string, original: Buffer): Promise<FotoProcesada> {
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(original).metadata();
  } catch {
    throw new ErrorFoto("El archivo no es una foto que se pueda leer (JPG, PNG o WebP).");
  }
  if (!meta.width || !meta.height) throw new ErrorFoto("El archivo no es una foto que se pueda leer.");

  // .rotate() sin argumentos endereza según el EXIF del celular.
  const base = sharp(original, { failOn: "none" }).rotate();
  const grande = await base
    .clone()
    .resize({ width: GRANDE, height: GRANDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const chica = await base
    .clone()
    .resize({ width: CHICA, height: CHICA, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  const archivo = `${carpeta}/${randomUUID()}`;
  await guardarArchivo(`${archivo}-g.webp`, grande.data);
  await guardarArchivo(`${archivo}-c.webp`, chica);
  return { archivo, ancho: grande.info.width, alto: grande.info.height };
}

export async function borrarFotos(archivos: string[]) {
  await borrarArchivos(archivos.flatMap((a) => [`${a}-g.webp`, `${a}-c.webp`]));
}

export function urlFoto(archivo: string, tam: "g" | "c" = "g") {
  return urlArchivo(`${archivo}-${tam}.webp`);
}

export class ErrorFoto extends Error {}
