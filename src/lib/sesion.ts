import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { puede, type Permiso, type Rol } from "@/lib/permisos";

export type Usuario = {
  id: string;
  nombre: string;
  iniciales: string;
  correo: string;
  rol: Rol;
};

/**
 * Quién está usando el panel. Verifica la sesión con Supabase y busca su
 * perfil. Sin sesión manda a «Entrar»; con una invitación pendiente, a
 * «Bienvenida»; con la cuenta desactivada, a «Entrar» con aviso.
 */
export const usuarioActual = cache(async (): Promise<Usuario> => {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  const cuenta = data.user;
  if (!cuenta) redirect("/entrar");

  const [perfil] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, cuenta.id)).limit(1);

  if (!perfil) {
    const [inv] = await db
      .select({ id: schema.invitaciones.id })
      .from(schema.invitaciones)
      .where(and(eq(schema.invitaciones.cuentaId, cuenta.id), eq(schema.invitaciones.estado, "pendiente")))
      .limit(1);
    if (inv) redirect("/bienvenida");
    redirect("/entrar?motivo=sin-acceso");
  }
  if (!perfil.activo) redirect("/entrar?motivo=desactivada");

  // Último acceso, a lo más una vez cada 10 minutos.
  await db
    .update(schema.usuarios)
    .set({ ultimoAcceso: new Date() })
    .where(
      and(
        eq(schema.usuarios.id, perfil.id),
        sql`(${schema.usuarios.ultimoAcceso} is null or ${schema.usuarios.ultimoAcceso} < now() - interval '10 minutes')`,
      ),
    );

  return {
    id: perfil.id,
    nombre: perfil.nombre,
    iniciales: perfil.iniciales,
    correo: perfil.correo,
    rol: perfil.rol,
  };
});

/** Para páginas y acciones: devuelve el usuario si tiene el permiso, o null. */
export async function usuarioCon(permiso: Permiso): Promise<Usuario | null> {
  const u = await usuarioActual();
  return puede(u.rol, permiso) ? u : null;
}

export async function avisosSinLeer(usuarioId: string): Promise<number> {
  const [fila] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.avisos)
    .where(
      and(eq(schema.avisos.para, usuarioId), isNull(schema.avisos.leidoEn), isNull(schema.avisos.resueltoEn)),
    );
  return fila?.n ?? 0;
}

/** Invitación pendiente y vigente de una cuenta. */
export async function invitacionPendiente(cuentaId: string) {
  const [inv] = await db
    .select()
    .from(schema.invitaciones)
    .where(
      and(
        eq(schema.invitaciones.cuentaId, cuentaId),
        eq(schema.invitaciones.estado, "pendiente"),
        gt(schema.invitaciones.venceEn, new Date()),
      ),
    )
    .limit(1);
  return inv ?? null;
}
