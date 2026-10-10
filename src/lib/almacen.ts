import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { supabaseAdmin } from "@/lib/supabase/servidor";

// Dónde viven las fotos de catálogo. En producción, el bucket público «fotos»
// de Supabase Storage; en local, la carpeta .almacen (se sirve desde
// /archivos/fotos). Se elige con ALMACEN_FOTOS.

const BUCKET = "fotos";
const enSupabase = () => process.env.ALMACEN_FOTOS === "supabase";
const CARPETA = path.join(process.cwd(), ".almacen", BUCKET);

/** Ruta segura dentro de la carpeta local: sin «..» ni rutas absolutas. */
export function rutaLocal(ruta: string): string | null {
  if (!/^[a-z0-9/_-]+\.webp$/i.test(ruta) || ruta.includes("..")) return null;
  return path.join(CARPETA, ruta);
}

export async function guardarArchivo(ruta: string, datos: Buffer): Promise<void> {
  if (enSupabase()) {
    const { error } = await supabaseAdmin()
      .storage.from(BUCKET)
      .upload(ruta, datos, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
    if (error) throw new Error(`No se pudo guardar la foto: ${error.message}`);
    return;
  }
  const destino = rutaLocal(ruta);
  if (!destino) throw new Error("Ruta de foto no válida");
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, datos);
}

export async function borrarArchivos(rutas: string[]): Promise<void> {
  if (rutas.length === 0) return;
  if (enSupabase()) {
    await supabaseAdmin().storage.from(BUCKET).remove(rutas);
    return;
  }
  await Promise.all(
    rutas.map((r) => {
      const destino = rutaLocal(r);
      return destino ? rm(destino, { force: true }) : null;
    }),
  );
}

export async function leerLocal(ruta: string): Promise<Buffer | null> {
  const destino = rutaLocal(ruta);
  if (!destino) return null;
  try {
    return await readFile(destino);
  } catch {
    return null;
  }
}

/** Dirección pública de un archivo del bucket de fotos. */
export function urlArchivo(ruta: string): string {
  if (enSupabase()) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${ruta}`;
  }
  return `/archivos/${BUCKET}/${ruta}`;
}
