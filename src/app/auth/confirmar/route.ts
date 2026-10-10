import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Destino de las ligas de invitación y de cambio de contraseña. Acepta el
// formato con token_hash (plantillas propias) y el de código (PKCE).
const DESTINOS = ["/bienvenida", "/nueva-contrasena", "/viajes"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const codigo = url.searchParams.get("code");
  const pedido = url.searchParams.get("next") ?? "/viajes";
  const destino = DESTINOS.includes(pedido) ? pedido : "/viajes";

  const supabase = await supabaseServidor();
  let ok = false;
  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    ok = !error;
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    ok = !error;
  }

  const salida = url.clone();
  salida.search = "";
  salida.pathname = ok ? destino : "/entrar";
  if (!ok) salida.searchParams.set("motivo", "liga-vencida");
  return NextResponse.redirect(salida);
}
