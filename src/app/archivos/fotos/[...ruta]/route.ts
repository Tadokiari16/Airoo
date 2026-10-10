import { leerLocal } from "@/lib/almacen";

// Solo en local (ALMACEN_FOTOS=local): sirve las fotos guardadas en .almacen.
// En producción las fotos salen directo del bucket público de Supabase.
export async function GET(_: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  if (process.env.ALMACEN_FOTOS === "supabase") return new Response(null, { status: 404 });
  const { ruta } = await params;
  const datos = await leerLocal(ruta.join("/"));
  if (!datos) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(datos), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
