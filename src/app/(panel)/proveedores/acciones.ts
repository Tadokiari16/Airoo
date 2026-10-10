"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { cifrar, descifrar } from "@/lib/cifrado";
import { usosDeProveedor, totalUsos } from "@/lib/catalogos";
import {
  NOMBRE_TIPO_CUENTA,
  agrupar,
  enmascarar,
  errorNumeroCuenta,
  listaParaAprobar,
  soloDigitos,
  telefonoParaConfirmar,
} from "@/lib/cuentas";
import { usuarioCon } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";
import { describirUsos } from "@/lib/usos";
import { proveedoresParecidos, type Parecido } from "./datos";

const RUTA = "/proveedores";

const CATEGORIAS = ["Hoteles", "Tours y parques", "Traslados", "Seguros", "Otro"] as const;
const PARA_QUE = ["reservas", "ventas", "pagos", "emergencias"] as const;

const opcional = z
  .string()
  .optional()
  .transform((v) => (v ? limpiar(v) : ""))
  .transform((v) => v || null);

const Contacto = z
  .object({
    nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre del contacto.")),
    paraQue: z.enum(PARA_QUE, { error: "Falta para qué se le escribe." }),
    whatsapp: opcional,
    correo: opcional.pipe(z.email("El correo no tiene un formato válido.").nullable()),
    horario: opcional,
  })
  .refine((c) => c.whatsapp || c.correo, "El contacto necesita WhatsApp o correo para poder escribirle.");

const Cuenta = z
  .object({
    tipo: z.enum(["clabe", "tarjeta"]),
    banco: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el banco de la cuenta.")),
    numero: z.string().transform(soloDigitos),
    aNombreDe: z
      .string()
      .transform(limpiar)
      .pipe(z.string().min(3, "Falta a nombre de quién está la cuenta.")),
  })
  .superRefine((c, ctx) => {
    const e = errorNumeroCuenta(c.tipo, c.numero);
    if (e) ctx.addIssue({ code: "custom", message: e });
  });

function datosContacto(f: FormData, prefijo = "") {
  return {
    nombre: f.get(prefijo + "nombre") ?? "",
    paraQue: f.get(prefijo + "paraQue") ?? "",
    whatsapp: f.get(prefijo + "whatsapp") ?? "",
    correo: f.get(prefijo + "correo") ?? "",
    horario: f.get(prefijo + "horario") ?? "",
  };
}

function datosCuenta(f: FormData) {
  return {
    tipo: f.get("cuenta_tipo") ?? "clabe",
    banco: f.get("cuenta_banco") ?? "",
    numero: f.get("cuenta_numero") ?? "",
    aNombreDe: f.get("cuenta_aNombreDe") ?? "",
  };
}

const describirCuenta = (c: { tipo: "clabe" | "tarjeta"; banco: string; ultimos4: string }) =>
  `${NOMBRE_TIPO_CUENTA[c.tipo]} ${c.banco} ${enmascarar(c.ultimos4)}`;

// ─── Alta y edición ──────────────────────────────────────────────────────────

export type ResultadoProveedor =
  | { error: string }
  | { parecidos: Parecido[] }
  | { guardado: string; id: string; mensaje: string }
  | undefined;

const Proveedor = z
  .object({
    nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre del proveedor.")),
    tipo: z.enum(["plataforma", "directo"], { error: "Falta elegir cómo le reservas." }),
    categorias: z.array(z.enum(CATEGORIAS)).min(1, "Falta elegir qué le compras."),
    sitio: opcional,
    numeroAgencia: opcional,
    notaInterna: opcional,
  })
  .refine((p) => p.tipo === "directo" || p.sitio, "Falta el sitio para agencias de la plataforma.");

export async function guardarProveedor(_: ResultadoProveedor, f: FormData): Promise<ResultadoProveedor> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: "Tu rol puede consultar proveedores, pero no darlos de alta ni cambiarlos." };

  const id = (f.get("id") as string) || null;
  const p = Proveedor.safeParse({
    nombre: f.get("nombre") ?? "",
    tipo: f.get("tipo") ?? "",
    categorias: f.getAll("categorias"),
    sitio: f.get("sitio") ?? "",
    numeroAgencia: f.get("numeroAgencia") ?? "",
    notaInterna: f.get("notaInterna") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const datos = {
    ...p.data,
    sitio:
      p.data.tipo === "plataforma"
        ? (p.data.sitio?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null)
        : null,
    numeroAgencia: p.data.tipo === "plataforma" ? p.data.numeroAgencia : null,
    nombreBusqueda: normalizar(p.data.nombre),
  };

  if (id) {
    const [antes] = await db.select().from(schema.proveedores).where(eq(schema.proveedores.id, id)).limit(1);
    if (!antes) return { error: "Ese proveedor ya no existe." };
    await db
      .update(schema.proveedores)
      .set({ ...datos, actualizadoEn: new Date() })
      .where(eq(schema.proveedores.id, id));
    await anotar({
      quien: yo.id,
      texto: `Proveedor editado: ${datos.nombre}`,
      entidad: "proveedores",
      entidadId: id,
      antes: { nombre: antes.nombre, tipo: antes.tipo, categorias: antes.categorias, sitio: antes.sitio },
      despues: { nombre: datos.nombre, tipo: datos.tipo, categorias: datos.categorias, sitio: datos.sitio },
    });
    revalidatePath(RUTA);
    return { guardado: datos.nombre, id, mensaje: "Cambios guardados · quedan en la bitácora" };
  }

  // Alta: contacto principal y, si es directo y lo registra el dueño, la cuenta.
  const conContacto = limpiar(String(f.get("contacto_nombre") ?? "")) !== "";
  const contacto = conContacto ? Contacto.safeParse(datosContacto(f, "contacto_")) : null;
  if (contacto && !contacto.success) return { error: contacto.error.issues[0].message };

  const conCuenta = datos.tipo === "directo" && soloDigitos(String(f.get("cuenta_numero") ?? "")) !== "";
  let cuenta: z.infer<typeof Cuenta> | null = null;
  if (conCuenta) {
    if (!(await usuarioCon("cuentas_proveedor")))
      return { error: "Solo el dueño registra cuentas de proveedores." };
    const c = Cuenta.safeParse(datosCuenta(f));
    if (!c.success) return { error: c.error.issues[0].message };
    cuenta = c.data;
  }

  if (f.get("confirmar") !== "si") {
    const parecidos = await proveedoresParecidos(datos.nombre);
    if (parecidos.length > 0) return { parecidos };
  }

  const nuevoId = await db.transaction(async (tx) => {
    const [nuevo] = await tx
      .insert(schema.proveedores)
      .values({ ...datos, creadoPor: yo.id })
      .returning({ id: schema.proveedores.id });
    if (contacto?.success) {
      await tx
        .insert(schema.proveedorContactos)
        .values({ ...contacto.data, proveedorId: nuevo.id, principal: true });
    }
    await anotar(
      {
        quien: yo.id,
        texto: `Proveedor agregado: ${datos.nombre} (${datos.tipo === "plataforma" ? "plataforma" : "directo"})`,
        entidad: "proveedores",
        entidadId: nuevo.id,
      },
      tx,
    );
    if (cuenta) {
      const telefono = contacto?.success ? contacto.data.whatsapp : null;
      const ultimos4 = cuenta.numero.slice(-4);
      await tx.insert(schema.proveedorCuentas).values({
        proveedorId: nuevo.id,
        tipo: cuenta.tipo,
        banco: cuenta.banco,
        aNombreDe: cuenta.aNombreDe,
        numeroCifrado: cifrar(cuenta.numero),
        ultimos4,
        telefonoLlamada: telefono,
        creadoPor: yo.id,
      });
      await anotar(
        {
          quien: yo.id,
          texto: `Cuenta registrada para ${datos.nombre}: ${describirCuenta({ ...cuenta, ultimos4 })}, por verificar con una llamada`,
          entidad: "proveedores",
          entidadId: nuevo.id,
        },
        tx,
      );
    }
    return nuevo.id;
  });

  revalidatePath(RUTA);
  return {
    guardado: datos.nombre,
    id: nuevoId,
    mensaje: cuenta ? "Proveedor creado · la cuenta queda por verificar con una llamada" : "Proveedor creado",
  };
}

// ─── Contactos y nota ────────────────────────────────────────────────────────

export async function agregarContacto(
  proveedorId: string,
  _: { error?: string; ok?: number } | undefined,
  f: FormData,
): Promise<{ error?: string; ok?: number }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: "Tu rol puede consultar los contactos, pero no cambiarlos." };
  const c = Contacto.safeParse(datosContacto(f));
  if (!c.success) return { error: c.error.issues[0].message };
  const [p] = await db
    .select()
    .from(schema.proveedores)
    .where(eq(schema.proveedores.id, proveedorId))
    .limit(1);
  if (!p) return { error: "Ese proveedor ya no existe." };
  const existentes = await db
    .select({ id: schema.proveedorContactos.id })
    .from(schema.proveedorContactos)
    .where(eq(schema.proveedorContactos.proveedorId, proveedorId));
  await db
    .insert(schema.proveedorContactos)
    .values({ ...c.data, proveedorId, principal: existentes.length === 0 });
  await anotar({
    quien: yo.id,
    texto: `Contacto agregado a ${p.nombre}: ${c.data.nombre}`,
    entidad: "proveedores",
    entidadId: proveedorId,
  });
  revalidatePath(RUTA);
  return { ok: Date.now() };
}

export async function quitarContacto(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: "Tu rol puede consultar los contactos, pero no cambiarlos." };
  const [c] = await db
    .select()
    .from(schema.proveedorContactos)
    .where(eq(schema.proveedorContactos.id, id))
    .limit(1);
  if (!c) return {};
  await db.transaction(async (tx) => {
    await tx.delete(schema.proveedorContactos).where(eq(schema.proveedorContactos.id, id));
    if (c.principal) {
      // El siguiente pasa a ser el principal.
      const [siguiente] = await tx
        .select({ id: schema.proveedorContactos.id })
        .from(schema.proveedorContactos)
        .where(eq(schema.proveedorContactos.proveedorId, c.proveedorId))
        .orderBy(schema.proveedorContactos.creadoEn)
        .limit(1);
      if (siguiente)
        await tx
          .update(schema.proveedorContactos)
          .set({ principal: true })
          .where(eq(schema.proveedorContactos.id, siguiente.id));
    }
    await anotar(
      {
        quien: yo.id,
        texto: `Contacto quitado: ${c.nombre}`,
        entidad: "proveedores",
        entidadId: c.proveedorId,
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return {};
}

export async function hacerPrincipal(id: string) {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return;
  const [c] = await db
    .select()
    .from(schema.proveedorContactos)
    .where(eq(schema.proveedorContactos.id, id))
    .limit(1);
  if (!c) return;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.proveedorContactos)
      .set({ principal: false })
      .where(eq(schema.proveedorContactos.proveedorId, c.proveedorId));
    await tx
      .update(schema.proveedorContactos)
      .set({ principal: true })
      .where(eq(schema.proveedorContactos.id, id));
  });
  revalidatePath(RUTA);
}

export async function guardarNota(proveedorId: string, texto: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: "Tu rol puede leer la nota, pero no cambiarla." };
  const nota = texto.trim() || null;
  const [p] = await db
    .update(schema.proveedores)
    .set({ notaInterna: nota, actualizadoEn: new Date() })
    .where(eq(schema.proveedores.id, proveedorId))
    .returning({ nombre: schema.proveedores.nombre });
  if (p)
    await anotar({
      quien: yo.id,
      texto: `Nota interna de ${p.nombre} actualizada`,
      entidad: "proveedores",
      entidadId: proveedorId,
    });
  revalidatePath(RUTA);
  return {};
}

// ─── Cuentas donde recibe ────────────────────────────────────────────────────

export async function registrarCuenta(
  proveedorId: string,
  reemplazaA: string | null,
  _: { error?: string; ok?: number } | undefined,
  f: FormData,
): Promise<{ error?: string; ok?: number }> {
  const yo = await usuarioCon("cuentas_proveedor");
  if (!yo) return { error: "Solo el dueño registra o cambia las cuentas de los proveedores." };
  const c = Cuenta.safeParse(datosCuenta(f));
  if (!c.success) return { error: c.error.issues[0].message };

  const [p] = await db
    .select()
    .from(schema.proveedores)
    .where(eq(schema.proveedores.id, proveedorId))
    .limit(1);
  if (!p) return { error: "Ese proveedor ya no existe." };
  const anterior = reemplazaA
    ? (
        await db
          .select()
          .from(schema.proveedorCuentas)
          .where(
            and(
              eq(schema.proveedorCuentas.id, reemplazaA),
              eq(schema.proveedorCuentas.proveedorId, proveedorId),
              eq(schema.proveedorCuentas.estado, "verificada"),
            ),
          )
          .limit(1)
      )[0]
    : null;
  if (reemplazaA && !anterior) return { error: "La cuenta que se quiere cambiar ya no está activa." };
  const contactos = await db
    .select({ whatsapp: schema.proveedorContactos.whatsapp, principal: schema.proveedorContactos.principal })
    .from(schema.proveedorContactos)
    .where(eq(schema.proveedorContactos.proveedorId, proveedorId));
  const telefono = telefonoParaConfirmar(anterior ?? null, contactos);
  const ultimos4 = c.data.numero.slice(-4);

  await db.transaction(async (tx) => {
    // Un cambio pendiente anterior para la misma cuenta se sustituye por este.
    await tx
      .update(schema.proveedorCuentas)
      .set({ estado: "rechazada", revisadaPor: yo.id, revisadaEn: new Date() })
      .where(
        and(
          eq(schema.proveedorCuentas.proveedorId, proveedorId),
          eq(schema.proveedorCuentas.estado, "pendiente"),
          reemplazaA
            ? eq(schema.proveedorCuentas.reemplazaA, reemplazaA)
            : isNull(schema.proveedorCuentas.reemplazaA),
        ),
      );
    await tx.insert(schema.proveedorCuentas).values({
      proveedorId,
      tipo: c.data.tipo,
      banco: c.data.banco,
      aNombreDe: c.data.aNombreDe,
      numeroCifrado: cifrar(c.data.numero),
      ultimos4,
      telefonoLlamada: telefono,
      reemplazaA: anterior?.id ?? null,
      creadoPor: yo.id,
    });
    await anotar(
      {
        quien: yo.id,
        texto: anterior
          ? `Cambio de cuenta pedido para ${p.nombre}: de ${describirCuenta(anterior)} a ${describirCuenta({ ...c.data, ultimos4 })}, por verificar con una llamada`
          : `Cuenta registrada para ${p.nombre}: ${describirCuenta({ ...c.data, ultimos4 })}, por verificar con una llamada`,
        entidad: "proveedores",
        entidadId: proveedorId,
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return { ok: Date.now() };
}

export async function revisarCuenta(
  cuentaId: string,
  decision: { aprobar: boolean; confirmoPorTelefono: boolean; estadoCuentaCoincide: boolean },
): Promise<{ error?: string; mensaje?: string }> {
  const yo = await usuarioCon("cuentas_proveedor");
  if (!yo) return { error: "Solo el dueño aprueba o rechaza las cuentas de los proveedores." };
  const [c] = await db
    .select()
    .from(schema.proveedorCuentas)
    .where(eq(schema.proveedorCuentas.id, cuentaId))
    .limit(1);
  if (!c || c.estado !== "pendiente") return { error: "Esta cuenta ya se revisó." };
  const [p] = await db
    .select()
    .from(schema.proveedores)
    .where(eq(schema.proveedores.id, c.proveedorId))
    .limit(1);
  const anterior = c.reemplazaA
    ? (
        await db
          .select()
          .from(schema.proveedorCuentas)
          .where(eq(schema.proveedorCuentas.id, c.reemplazaA))
          .limit(1)
      )[0]
    : null;

  if (!decision.aprobar) {
    await db
      .update(schema.proveedorCuentas)
      .set({ estado: "rechazada", revisadaPor: yo.id, revisadaEn: new Date() })
      .where(eq(schema.proveedorCuentas.id, cuentaId));
    await anotar({
      quien: yo.id,
      texto: `Cuenta rechazada para ${p.nombre}: ${describirCuenta(c)}`,
      entidad: "proveedores",
      entidadId: c.proveedorId,
    });
    revalidatePath(RUTA);
    return {
      mensaje: anterior
        ? `Cambio rechazado · se queda ${anterior.banco} ${enmascarar(anterior.ultimos4)}`
        : "Cuenta rechazada",
    };
  }

  if (!listaParaAprobar(decision))
    return { error: "Para aprobarla falta confirmar la llamada y que el estado de cuenta coincide." };
  if (!c.telefonoLlamada)
    return { error: "No hay un teléfono registrado del proveedor al cual llamar para confirmar la cuenta." };

  await db.transaction(async (tx) => {
    await tx
      .update(schema.proveedorCuentas)
      .set({
        estado: "verificada",
        confirmoPorTelefono: true,
        estadoCuentaCoincide: true,
        revisadaPor: yo.id,
        revisadaEn: new Date(),
        primerPagoRevisado: false,
      })
      .where(eq(schema.proveedorCuentas.id, cuentaId));
    if (anterior)
      await tx
        .update(schema.proveedorCuentas)
        .set({ estado: "reemplazada" })
        .where(eq(schema.proveedorCuentas.id, anterior.id));
    await anotar(
      {
        quien: yo.id,
        texto: `Cuenta aprobada para ${p.nombre}: ${describirCuenta(c)}, confirmada por llamada al ${c.telefonoLlamada}. El primer pago queda marcado para revisión`,
        entidad: "proveedores",
        entidadId: c.proveedorId,
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return { mensaje: "Cuenta aprobada · el primer pago se marca para revisión" };
}

/** Número completo para verlo o copiarlo. Cada vez queda en la bitácora. */
export async function cuentaCompleta(
  cuentaId: string,
  para: "ver" | "copiar",
): Promise<{ error?: string; numero?: string }> {
  const yo = await usuarioCon("ver_cuenta_completa");
  if (!yo)
    return { error: "Tu rol ve las cuentas enmascaradas; el número completo lo ven el dueño y el contador." };
  const [c] = await db
    .select()
    .from(schema.proveedorCuentas)
    .where(eq(schema.proveedorCuentas.id, cuentaId))
    .limit(1);
  if (!c) return { error: "Esa cuenta ya no existe." };
  const [p] = await db
    .select()
    .from(schema.proveedores)
    .where(eq(schema.proveedores.id, c.proveedorId))
    .limit(1);
  await anotar({
    quien: yo.id,
    texto: `${para === "copiar" ? "Copió" : "Vio"} completa la ${NOMBRE_TIPO_CUENTA[c.tipo]} de ${p.nombre} (${c.banco} ${enmascarar(c.ultimos4)})`,
    entidad: "proveedores",
    entidadId: c.proveedorId,
  });
  return { numero: agrupar(descifrar(c.numeroCifrado)) };
}

// ─── Archivar y eliminar ─────────────────────────────────────────────────────

export async function archivarProveedor(
  id: string,
  archivar: boolean,
  motivo = "",
): Promise<{ error?: string }> {
  const yo = await usuarioCon("archivar_catalogos");
  if (!yo) return { error: "Tu rol no archiva proveedores." };
  const [p] = await db.select().from(schema.proveedores).where(eq(schema.proveedores.id, id)).limit(1);
  if (!p || !!p.archivadoEn === archivar) return {};
  await db
    .update(schema.proveedores)
    .set({
      archivadoEn: archivar ? new Date() : null,
      archivadoPor: archivar ? yo.id : null,
      motivoArchivo: archivar ? limpiar(motivo) || null : null,
      actualizadoEn: new Date(),
    })
    .where(eq(schema.proveedores.id, id));
  await anotar({
    quien: yo.id,
    texto: archivar
      ? `Proveedor archivado: ${p.nombre}${limpiar(motivo) ? ` · ${limpiar(motivo)}` : ""}`
      : `Proveedor reactivado: ${p.nombre}`,
    entidad: "proveedores",
    entidadId: id,
  });
  revalidatePath(RUTA);
  return {};
}

export async function eliminarProveedor(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("eliminar_catalogos");
  if (!yo) return { error: "Solo el dueño elimina proveedores. Se puede archivar." };
  const [p] = await db.select().from(schema.proveedores).where(eq(schema.proveedores.id, id)).limit(1);
  if (!p) return {};
  const usos = await usosDeProveedor(id);
  if (totalUsos(usos) > 0)
    return { error: `No se puede eliminar: ${describirUsos(usos)}. Se puede archivar.` };
  // Contactos y cuentas se borran con él (en cascada).
  await db.transaction(async (tx) => {
    await tx.delete(schema.proveedores).where(eq(schema.proveedores.id, id));
    await anotar(
      { quien: yo.id, texto: `Proveedor eliminado: ${p.nombre}`, entidad: "proveedores", entidadId: id },
      tx,
    );
  });
  revalidatePath(RUTA);
  return {};
}
