"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { invitacionPendiente } from "@/lib/sesion";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { iniciales, limpiar } from "@/lib/texto";
import { urlSitio } from "@/lib/sitio";

export type Estado = { error?: string; listo?: boolean } | undefined;

const MIN_CONTRASENA = 10;

export async function entrar(_: Estado, datos: FormData): Promise<Estado> {
  const correo = String(datos.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const contrasena = String(datos.get("contrasena") ?? "");
  if (!correo || !contrasena) return { error: "Falta el correo o la contraseña." };

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) return { error: "El correo o la contraseña no coinciden." };
  redirect("/viajes");
}

export async function salir() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function pedirRecuperacion(_: Estado, datos: FormData): Promise<Estado> {
  const correo = String(datos.get("correo") ?? "")
    .trim()
    .toLowerCase();
  if (!correo.includes("@")) return { error: "Ese correo no parece completo." };
  const supabase = await supabaseServidor();
  await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${urlSitio()}/auth/confirmar?next=/nueva-contrasena`,
  });
  // Mismo mensaje exista o no la cuenta, para no revelar quién tiene acceso.
  return { listo: true };
}

function validarContrasena(a: string, b: string): string | null {
  if (a.length < MIN_CONTRASENA) return `La contraseña lleva al menos ${MIN_CONTRASENA} caracteres.`;
  if (a !== b) return "Las dos contraseñas no coinciden.";
  return null;
}

function mensajeContrasena(codigo?: string): string | null {
  if (codigo === "same_password") return "La contraseña nueva es igual a la anterior. Elige otra.";
  if (codigo === "weak_password")
    return "Esa contraseña es fácil de adivinar. Elige otra más larga o menos común.";
  return null;
}

export async function guardarContrasena(_: Estado, datos: FormData): Promise<Estado> {
  const a = String(datos.get("contrasena") ?? "");
  const b = String(datos.get("confirmacion") ?? "");
  const error = validarContrasena(a, b);
  if (error) return { error };

  const supabase = await supabaseServidor();
  const { error: e } = await supabase.auth.updateUser({ password: a });
  if (e)
    return {
      error: mensajeContrasena(e.code) ?? "No se pudo guardar. La liga pudo haber vencido; pide otra.",
    };
  redirect("/viajes");
}

/** La persona invitada elige su contraseña y queda en el equipo con el rol de la invitación. */
export async function aceptarInvitacion(_: Estado, datos: FormData): Promise<Estado> {
  const a = String(datos.get("contrasena") ?? "");
  const b = String(datos.get("confirmacion") ?? "");
  const error = validarContrasena(a, b);
  if (error) return { error };

  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");

  const inv = await invitacionPendiente(data.user.id);
  if (!inv) return { error: "La invitación ya no está vigente. El dueño puede mandarte otra." };

  const { error: e } = await supabase.auth.updateUser({ password: a });
  if (e) return { error: mensajeContrasena(e.code) ?? "No se pudo guardar la contraseña. Intenta de nuevo." };

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.usuarios)
      .values({
        id: data.user!.id,
        nombre: inv.nombre,
        iniciales: iniciales(inv.nombre),
        correo: inv.correo,
        whatsapp: inv.whatsapp,
        rol: inv.rol,
      })
      .onConflictDoNothing();
    await tx
      .update(schema.invitaciones)
      .set({ estado: "aceptada", aceptadaEn: new Date() })
      .where(eq(schema.invitaciones.id, inv.id));
    await anotar(
      {
        quien: data.user!.id,
        texto: `${limpiar(inv.nombre)} se unió al equipo`,
        entidad: "usuarios",
        entidadId: data.user!.id,
      },
      tx,
    );
  });
  redirect("/viajes");
}
