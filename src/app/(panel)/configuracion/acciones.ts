"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { cifrar } from "@/lib/cifrado";
import { errorNumeroCuenta, soloDigitos } from "@/lib/cuentas";
import { activaDesde, ESQUEMAS, textoBitacora, type ClaveEditable } from "@/lib/configuracion";
import { formatoDia, formatoFechaHora, hoyEnCancun } from "@/lib/fechas";
import { textoTipoCambio } from "@/lib/cotizacion";
import { guardarTipoCambio } from "@/lib/tipo-cambio";
import { usuarioCon } from "@/lib/sesion";
import { limpiar } from "@/lib/texto";

type Resultado = { ok: true } | { error: string };

const SIN_PERMISO = "Solo el dueño cambia la configuración.";

/** Guarda un ajuste y deja en la bitácora qué cambió, con el valor anterior. */
export async function guardarAjuste<C extends ClaveEditable>(clave: C, valor: unknown): Promise<Resultado> {
  const yo = await usuarioCon("configuracion");
  if (!yo) return { error: SIN_PERMISO };
  const esquema = ESQUEMAS[clave];
  if (!esquema) return { error: "Ese ajuste no existe." };
  const p = esquema.safeParse(valor);
  if (!p.success) return { error: p.error.issues[0].message };

  const t = schema.configuracion;
  await db.transaction(async (tx) => {
    const [antes] = await tx.select({ valor: t.valor }).from(t).where(eq(t.clave, clave)).for("update");
    if (antes && JSON.stringify(antes.valor) === JSON.stringify(p.data)) return;
    await tx
      .insert(t)
      .values({ clave, valor: p.data, actualizadoPor: yo.id })
      .onConflictDoUpdate({
        target: t.clave,
        set: { valor: p.data, actualizadoPor: yo.id, actualizadoEn: sql`now()` },
      });
    await anotar(
      {
        quien: yo.id,
        texto: textoBitacora(clave, p.data as never),
        entidad: "configuracion",
        antes: antes?.valor ?? null,
        despues: p.data,
      },
      tx,
    );
  });
  revalidatePath("/configuracion", "layout");
  return { ok: true };
}

// ---- Cuenta para recibir pagos ----

/** Cliente sin cookies: confirma la identidad sin tocar la sesión del panel. */
function clienteAparte() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Manda el código de 6 dígitos al correo del dueño. */
export async function pedirCodigo(): Promise<Resultado & { correo?: string }> {
  const yo = await usuarioCon("cambiar_cuentas");
  if (!yo) return { error: "Solo el dueño cambia la cuenta para recibir pagos." };
  const { error } = await clienteAparte().auth.signInWithOtp({
    email: yo.correo,
    options: { shouldCreateUser: false },
  });
  if (error)
    return {
      error:
        error.status === 429
          ? "Ya se mandaron varios códigos hace poco. Se puede confirmar con la contraseña."
          : "No se pudo mandar el código. Se puede confirmar con la contraseña.",
    };
  return { ok: true, correo: yo.correo };
}

const CambioCuenta = z.object({
  banco: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el banco.")),
  clabe: z.string().transform(soloDigitos),
  metodo: z.enum(["codigo", "contrasena"]),
  secreto: z.string().min(1, "Falta el código o la contraseña."),
});

/** Confirma quién es con el código del correo o su contraseña. */
async function confirmarIdentidad(correo: string, metodo: "codigo" | "contrasena", secreto: string) {
  const cliente = clienteAparte();
  const { data, error } =
    metodo === "codigo"
      ? await cliente.auth.verifyOtp({ email: correo, token: secreto.replace(/\s/g, ""), type: "email" })
      : await cliente.auth.signInWithPassword({ email: correo, password: secreto });
  if (error || !data.session) return false;
  // Cierra solo la sesión que se abrió para confirmar.
  await cliente.auth.signOut({ scope: "local" });
  return true;
}

export async function cambiarCuentaCobro(
  datos: z.input<typeof CambioCuenta>,
): Promise<Resultado & { activaEn?: string }> {
  const yo = await usuarioCon("cambiar_cuentas");
  if (!yo) return { error: "Solo el dueño cambia la cuenta para recibir pagos." };
  const p = CambioCuenta.safeParse(datos);
  if (!p.success) return { error: p.error.issues[0].message };
  const { banco, clabe, metodo, secreto } = p.data;
  const errorClabe = errorNumeroCuenta("clabe", clabe);
  if (errorClabe) return { error: errorClabe };

  if (!(await confirmarIdentidad(yo.correo, metodo, secreto)))
    return {
      error:
        metodo === "codigo"
          ? "El código no coincide o ya venció."
          : "La contraseña no coincide. La cuenta sigue sin cambios.",
    };

  const t = schema.cuentasCobroAiroo;
  const ahora = new Date();
  const desde = activaDesde(ahora);
  await db.transaction(async (tx) => {
    // Un cambio anterior que no se activó queda reemplazado por este.
    await tx
      .update(t)
      .set({ estado: "reemplazada", actualizadoEn: sql`now()` })
      .where(eq(t.estado, "por_activar"));
    const [nueva] = await tx
      .insert(t)
      .values({
        banco,
        clabeCifrada: cifrar(clabe),
        ultimos4: clabe.slice(-4),
        principal: false,
        estado: "por_activar",
        activaDesde: desde,
        creadoPor: yo.id,
      })
      .returning({ id: t.id });
    await anotar(
      {
        quien: yo.id,
        texto: `Cambio de cuenta para recibir pagos · CLABE ··${clabe.slice(-4)} · se activa ${formatoFechaHora(desde)} · confirmado con ${metodo === "codigo" ? "código por correo" : "contraseña"}`,
        entidad: "cuentas_cobro_airoo",
        entidadId: nueva.id,
      },
      tx,
    );
  });
  revalidatePath("/configuracion", "layout");
  return { ok: true, activaEn: formatoFechaHora(desde) };
}

export async function cancelarCambioCuenta(id: string): Promise<Resultado> {
  const yo = await usuarioCon("cambiar_cuentas");
  if (!yo) return { error: "Solo el dueño cambia la cuenta para recibir pagos." };
  const t = schema.cuentasCobroAiroo;
  const [c] = await db
    .update(t)
    .set({ estado: "reemplazada", actualizadoEn: sql`now()` })
    .where(and(eq(t.id, id), eq(t.estado, "por_activar"), sql`${t.activaDesde} > now()`))
    .returning({ ultimos4: t.ultimos4 });
  if (!c) return { error: "Ese cambio ya no está pendiente." };
  await anotar({
    quien: yo.id,
    texto: `Cambio de cuenta para recibir pagos cancelado · CLABE ··${c.ultimos4}`,
    entidad: "cuentas_cobro_airoo",
    entidadId: id,
  });
  revalidatePath("/configuracion", "layout");
  return { ok: true };
}

// ---- Formas de pago de Airoo ----

const FormaPago = z.object({
  tipo: z.enum(["tarjeta", "cuenta"]),
  nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre.")),
  banco: z.string().transform(limpiar),
  ultimos4: z.string().transform(soloDigitos).pipe(z.string().length(4, "Van los últimos 4 dígitos.")),
  uso: z.string().transform(limpiar),
});

export async function agregarFormaPago(datos: z.input<typeof FormaPago>): Promise<Resultado> {
  const yo = await usuarioCon("configuracion");
  if (!yo) return { error: SIN_PERMISO };
  const p = FormaPago.safeParse(datos);
  if (!p.success) return { error: p.error.issues[0].message };
  const f = p.data;
  const [nueva] = await db
    .insert(schema.formasPagoAiroo)
    .values({ ...f, banco: f.banco || null, uso: f.uso || null, creadoPor: yo.id })
    .returning({ id: schema.formasPagoAiroo.id });
  await anotar({
    quien: yo.id,
    texto: `Forma de pago agregada · ${f.tipo === "tarjeta" ? "Tarjeta" : "Cuenta"} ··${f.ultimos4}`,
    entidad: "formas_pago_airoo",
    entidadId: nueva.id,
  });
  revalidatePath("/configuracion/pagos-proveedores");
  return { ok: true };
}

export async function activarFormaPago(id: string, activa: boolean): Promise<Resultado> {
  const yo = await usuarioCon("configuracion");
  if (!yo) return { error: SIN_PERMISO };
  const t = schema.formasPagoAiroo;
  const [f] = await db
    .update(t)
    .set({ activa, actualizadoEn: sql`now()` })
    .where(eq(t.id, id))
    .returning({ nombre: t.nombre, ultimos4: t.ultimos4 });
  if (!f) return { error: "Esa forma de pago ya no existe." };
  await anotar({
    quien: yo.id,
    texto: `Forma de pago ${activa ? "activa de nuevo" : "en desuso"} · ${f.nombre} ··${f.ultimos4}`,
    entidad: "formas_pago_airoo",
    entidadId: id,
  });
  revalidatePath("/configuracion/pagos-proveedores");
  return { ok: true };
}

// ---- Tipo de cambio a mano ----

/** Cuando Banxico no llega (sin token o sin servicio), el Dueño captura el de hoy. */
export async function guardarTipoCambioManual(moneda: "USD" | "EUR", diezmilesimos: number): Promise<Resultado> {
  const yo = await usuarioCon("capturar_tipo_cambio");
  if (!yo) return { error: "Solo el dueño captura el tipo de cambio." };
  if (!Number.isInteger(diezmilesimos) || diezmilesimos < 1_0000 || diezmilesimos > 100_0000)
    return { error: "El tipo de cambio va en pesos, por ejemplo 18.42." };
  const fecha = hoyEnCancun();
  await guardarTipoCambio({ moneda, fecha, diezmilesimos }, "manual", yo.id);
  await anotar({
    quien: yo.id,
    texto: `Tipo de cambio capturado a mano: ${moneda === "USD" ? "dólar" : "euro"} ${textoTipoCambio(diezmilesimos)} (${formatoDia(fecha)})`,
    entidad: "tipos_cambio",
  });
  revalidatePath("/configuracion/precios");
  return { ok: true };
}

// ---- Viajes de ejemplo ----

/** Clave que recuerda que se borraron: la semilla ya no los vuelve a crear. */
const CLAVE_VIAJES_EJEMPLO = "viajes_ejemplo";

export async function contarViajesEjemplo(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.viajes)
    .where(eq(schema.viajes.ejemplo, true));
  return r?.n ?? 0;
}

/** Borra los viajes y clientes de ejemplo. Los catálogos no cambian. */
export async function borrarViajesEjemplo(): Promise<Resultado> {
  const yo = await usuarioCon("configuracion");
  if (!yo) return { error: SIN_PERMISO };
  const n = await contarViajesEjemplo();
  await db.transaction(async (tx) => {
    await tx.delete(schema.viajes).where(eq(schema.viajes.ejemplo, true));
    await tx
      .delete(schema.clientes)
      .where(
        and(
          eq(schema.clientes.ejemplo, true),
          sql`not exists (select 1 from ${schema.viajes} where ${schema.viajes.clienteId} = ${schema.clientes.id})`,
        ),
      );
    await tx
      .insert(schema.configuracion)
      .values({ clave: CLAVE_VIAJES_EJEMPLO, valor: { borrados: true }, actualizadoPor: yo.id })
      .onConflictDoNothing();
    await anotar(
      { quien: yo.id, texto: `Se borraron los viajes de ejemplo (${n})`, entidad: "configuracion" },
      tx,
    );
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
