import { actualizarDesdeBanxico } from "@/lib/tipo-cambio";

// Tarea diaria (vercel.json): trae el FIX de Banxico después de que se publica.
// Vercel manda «Authorization: Bearer CRON_SECRET».
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "Sin autorización" }, { status: 401 });
  }
  if (!process.env.BANXICO_TOKEN) {
    return Response.json({ error: "Falta BANXICO_TOKEN; el FIX se captura a mano en Configuración" }, { status: 503 });
  }
  try {
    const datos = await actualizarDesdeBanxico();
    return Response.json({ ok: true, datos });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Banxico no respondió" }, { status: 502 });
  }
}
