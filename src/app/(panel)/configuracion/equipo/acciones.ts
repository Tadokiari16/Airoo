"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { NOMBRE_ROL } from "@/lib/permisos";
import { usuarioCon } from "@/lib/sesion";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { limpiar } from "@/lib/texto";
import { urlSitio } from "@/lib/sitio";

const VIGENCIA_HORAS = 24;
const RUTA = "/configuracion/equipo";
const PARA_SIEMPRE = "876000h"; // bloqueo de la cuenta mientras está desactivada

export type ResultadoInvitar =
  | { error: string }
  | { liga: string; nombre: string; correo: string; whatsapp: string | null; rol: string }
  | undefined;

const Invitacion = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre.")),
  correo: z.string().trim().toLowerCase().pipe(z.email("Ese correo no parece completo.")),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, "") || null),
  rol: z.enum(["asesora", "contador"], { error: "Falta elegir el rol." }),
});

function ligaDeInvitacion(tokenHash: string) {
  const u = new URL("/auth/confirmar", urlSitio());
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", "invite");
  u.searchParams.set("next", "/bienvenida");
  return u.toString();
}

export async function invitar(_: ResultadoInvitar, datos: FormData): Promise<ResultadoInvitar> {
  const yo = await usuarioCon("configuracion");
  if (!yo) return { error: "Solo el dueño invita personas al equipo." };

  const p = Invitacion.safeParse(Object.fromEntries(datos));
  if (!p.success) return { error: p.error.issues[0].message };
  const { nombre, correo, whatsapp, rol } = p.data;

  const [yaEsta] = await db
    .select({ id: schema.usuarios.id })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.correo, correo))
    .limit(1);
  if (yaEsta) return { error: "Ese correo ya tiene cuenta en el equipo." };

  const admin = supabaseAdmin();

  // Una invitación pendiente con el mismo correo se reemplaza por la nueva.
  const anteriores = await db
    .select()
    .from(schema.invitaciones)
    .where(and(eq(schema.invitaciones.correo, correo), eq(schema.invitaciones.estado, "pendiente")));
  for (const a of anteriores) await admin.auth.admin.deleteUser(a.cuentaId);

  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email: correo });
  if (error || !data.user) return { error: "No se pudo crear la invitación. Intenta de nuevo." };

  await db.insert(schema.invitaciones).values({
    nombre,
    correo,
    whatsapp,
    rol,
    cuentaId: data.user.id,
    invitadoPor: yo.id,
    venceEn: new Date(Date.now() + VIGENCIA_HORAS * 3600_000),
  });
  await anotar({
    quien: yo.id,
    texto: `Invitación a ${nombre} como ${NOMBRE_ROL[rol]}`,
    entidad: "invitaciones",
    entidadId: correo,
  });
  revalidatePath(RUTA);

  return {
    liga: ligaDeInvitacion(data.properties.hashed_token),
    nombre,
    correo,
    whatsapp,
    rol: NOMBRE_ROL[rol],
  };
}

export async function cancelarInvitacion(id: string) {
  const yo = await usuarioCon("configuracion");
  if (!yo) return;
  const [inv] = await db.select().from(schema.invitaciones).where(eq(schema.invitaciones.id, id)).limit(1);
  if (!inv || inv.estado !== "pendiente") return;
  // Borrar la cuenta sin contraseña borra también la invitación.
  await supabaseAdmin().auth.admin.deleteUser(inv.cuentaId);
  await anotar({
    quien: yo.id,
    texto: `Invitación a ${inv.nombre} cancelada`,
    entidad: "invitaciones",
    entidadId: inv.correo,
  });
  revalidatePath(RUTA);
}

async function persona(id: string) {
  const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, id)).limit(1);
  return u;
}

export async function cambiarRol(id: string, rol: "asesora" | "contador") {
  const yo = await usuarioCon("configuracion");
  if (!yo || id === yo.id) return;
  const u = await persona(id);
  if (!u || u.rol === "dueno" || u.rol === rol || !["asesora", "contador"].includes(rol)) return;
  await db.update(schema.usuarios).set({ rol, actualizadoEn: new Date() }).where(eq(schema.usuarios.id, id));
  await anotar({
    quien: yo.id,
    texto: `${u.nombre} ahora es ${NOMBRE_ROL[rol]}`,
    entidad: "usuarios",
    entidadId: id,
    antes: { rol: u.rol },
    despues: { rol },
  });
  revalidatePath(RUTA);
}

export async function cambiarActivo(id: string, activo: boolean) {
  const yo = await usuarioCon("configuracion");
  if (!yo || id === yo.id) return;
  const u = await persona(id);
  if (!u || u.rol === "dueno" || u.activo === activo) return;
  await supabaseAdmin().auth.admin.updateUserById(id, { ban_duration: activo ? "none" : PARA_SIEMPRE });
  await db
    .update(schema.usuarios)
    .set({ activo, actualizadoEn: new Date() })
    .where(eq(schema.usuarios.id, id));
  await anotar({
    quien: yo.id,
    texto: activo ? `${u.nombre} volvió al equipo` : `${u.nombre} ya no tiene acceso al panel`,
    entidad: "usuarios",
    entidadId: id,
  });
  revalidatePath(RUTA);
}
