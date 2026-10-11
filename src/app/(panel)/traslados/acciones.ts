"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { viajesQueUsan } from "@/lib/catalogos";
import { anotar } from "@/lib/bitacora";
import { borrarFotos, ErrorFoto, MAX_BYTES, procesarFoto } from "@/lib/imagenes";
import { errorCapacidad, MAX_MALETAS, MAX_PASAJEROS } from "@/lib/traslados";
import { usuarioCon } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";

const RUTA = "/traslados";
const SIN_PERMISO = "Tu rol puede consultar los traslados, pero no cambiarlos.";
const t = schema.trasladoUnidades;

async function unidad(id: string) {
  const [u] = await db.select().from(t).where(eq(t.id, id)).limit(1);
  return u ?? null;
}

const Datos = z
  .object({
    nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre.").max(60)),
    pasajeros: z.number().int(`Los pasajeros van de 1 a ${MAX_PASAJEROS}.`),
    maletas: z.number().int(`Las maletas van de 0 a ${MAX_MALETAS}.`),
    adaptada: z.boolean(),
    descripcion: z
      .string()
      .nullish()
      .transform((v) => limpiar(v ?? "") || null)
      .pipe(z.string().max(400, "La descripción lleva hasta 400 caracteres.").nullable()),
  })
  .superRefine((d, ctx) => {
    const e = errorCapacidad(d);
    if (e) ctx.addIssue({ code: "custom", message: e });
  });

export type DatosUnidad = z.input<typeof Datos>;

/** Otro tipo de unidad con el mismo nombre (sin acentos ni mayúsculas). */
async function repetida(nombre: string, sinId?: string) {
  const [r] = await db
    .select({ nombre: t.nombre, archivado: t.archivadoEn })
    .from(t)
    .where(and(eq(t.nombreBusqueda, normalizar(nombre)), sinId ? ne(t.id, sinId) : undefined))
    .limit(1);
  if (!r) return null;
  return r.archivado
    ? `${r.nombre} ya está en el catálogo, archivada. Se puede reactivar desde Archivadas.`
    : `${r.nombre} ya está en el catálogo.`;
}

export async function crearUnidad(datos: DatosUnidad): Promise<{ error: string } | { id: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const p = Datos.safeParse(datos);
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  const ya = await repetida(d.nombre);
  if (ya) return { error: ya };
  const id = await db.transaction(async (tx) => {
    const [nueva] = await tx
      .insert(t)
      .values({ ...d, nombreBusqueda: normalizar(d.nombre), creadoPor: yo.id })
      .returning({ id: t.id });
    await anotar(
      { quien: yo.id, texto: `Tipo de unidad agregado: ${d.nombre}`, entidad: "traslados", entidadId: nueva.id },
      tx,
    );
    return nueva.id;
  });
  revalidatePath(RUTA);
  return { id };
}

export async function guardarUnidad(id: string, datos: DatosUnidad): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const antes = await unidad(id);
  if (!antes) return { error: "Ese tipo de unidad ya no está en el catálogo." };
  const p = Datos.safeParse(datos);
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  const ya = await repetida(d.nombre, id);
  if (ya) return { error: ya };
  await db.transaction(async (tx) => {
    await tx
      .update(t)
      .set({ ...d, nombreBusqueda: normalizar(d.nombre), actualizadoEn: new Date() })
      .where(eq(t.id, id));
    await anotar(
      {
        quien: yo.id,
        texto: `Tipo de unidad ${d.nombre} guardado`,
        entidad: "traslados",
        entidadId: id,
        antes: { nombre: antes.nombre, pasajeros: antes.pasajeros, maletas: antes.maletas, adaptada: antes.adaptada },
        despues: { nombre: d.nombre, pasajeros: d.pasajeros, maletas: d.maletas, adaptada: d.adaptada },
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return {};
}

/** Una sola foto por tipo de unidad: la nueva reemplaza a la anterior. */
export async function subirFotoUnidad(id: string, f: FormData): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const u = await unidad(id);
  if (!u) return { error: "Ese tipo de unidad ya no está en el catálogo." };
  const archivos = f.getAll("fotos").filter((x): x is File => x instanceof File && x.size > 0);
  if (archivos.length !== 1) return { error: "Cada tipo de unidad lleva una sola foto." };
  if (archivos[0].size > MAX_BYTES) return { error: "La foto pasa de 12 MB." };
  let archivo: string;
  try {
    ({ archivo } = await procesarFoto(`traslados/${id}`, Buffer.from(await archivos[0].arrayBuffer())));
  } catch (e) {
    if (e instanceof ErrorFoto) return { error: e.message };
    throw e;
  }
  await db.update(t).set({ foto: archivo, actualizadoEn: new Date() }).where(eq(t.id, id));
  if (u.foto) await borrarFotos([u.foto]);
  await anotar({
    quien: yo.id,
    texto: `${u.foto ? "Foto cambiada" : "Foto nueva"} en ${u.nombre}`,
    entidad: "traslados",
    entidadId: id,
  });
  revalidatePath(RUTA);
  return {};
}

export async function quitarFotoUnidad(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const u = await unidad(id);
  if (!u?.foto) return {};
  await db.update(t).set({ foto: null, actualizadoEn: new Date() }).where(eq(t.id, id));
  await borrarFotos([u.foto]);
  await anotar({ quien: yo.id, texto: `Foto quitada de ${u.nombre}`, entidad: "traslados", entidadId: id });
  revalidatePath(RUTA);
  return {};
}

// ─── Archivar y eliminar ─────────────────────────────────────────────────────

export async function archivarUnidad(id: string, archivar: boolean, motivo = ""): Promise<{ error?: string }> {
  const yo = await usuarioCon("archivar_catalogos");
  if (!yo) return { error: "Tu rol no archiva tipos de unidad." };
  const u = await unidad(id);
  if (!u || !!u.archivadoEn === archivar) return {};
  await db
    .update(t)
    .set({
      archivadoEn: archivar ? new Date() : null,
      archivadoPor: archivar ? yo.id : null,
      motivoArchivo: archivar ? limpiar(motivo) || null : null,
      actualizadoEn: new Date(),
    })
    .where(eq(t.id, id));
  await anotar({
    quien: yo.id,
    texto: archivar
      ? `Tipo de unidad archivado: ${u.nombre}${limpiar(motivo) ? ` · ${limpiar(motivo)}` : ""}`
      : `Tipo de unidad reactivado: ${u.nombre}`,
    entidad: "traslados",
    entidadId: id,
  });
  revalidatePath(RUTA);
  return {};
}

export async function eliminarUnidad(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("eliminar_catalogos");
  if (!yo) return { error: "Solo el dueño elimina tipos de unidad. Se puede archivar." };
  const u = await unidad(id);
  if (!u) return {};
  const viajes = await viajesQueUsan("trasladoUnidadId", id);
  if (viajes > 0)
    return {
      error: `Se usó en ${viajes} ${viajes === 1 ? "viaje" : "viajes"}, así que no se puede eliminar; se puede archivar.`,
    };
  await db.transaction(async (tx) => {
    await tx.delete(t).where(eq(t.id, id));
    await anotar(
      { quien: yo.id, texto: `Tipo de unidad eliminado: ${u.nombre}`, entidad: "traslados", entidadId: id },
      tx,
    );
  });
  if (u.foto) await borrarFotos([u.foto]);
  revalidatePath(RUTA);
  return {};
}
