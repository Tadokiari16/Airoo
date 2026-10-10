"use server";

// Fotos de hoteles, habitaciones y actividades: una sola tabla y las mismas
// acciones. Se guardan al momento, sin esperar a «Guardar» en la ficha.

import { revalidatePath } from "next/cache";
import { and, eq, inArray, max } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { encuadreInicial, encuadreValido, evaluarPortada, type Encuadre } from "@/lib/fotos";
import { borrarFotos, ErrorFoto, MAX_BYTES, procesarFoto } from "@/lib/imagenes";
import { usuarioCon } from "@/lib/sesion";

export type DuenoFotos = { tipo: "hotel"; id: string } | { tipo: "actividad"; id: string };
export type Destino = "portada" | "galeria" | { habitacionId: string };

const SIN_PERMISO = "Tu rol puede consultar los catálogos, pero no cambiar sus fotos.";

const config = {
  hotel: {
    tabla: schema.hoteles,
    columna: schema.fotos.hotelId,
    carpeta: "hoteles",
    ruta: "/hoteles",
    entidad: "hoteles",
    falta: "Ese hotel ya no existe.",
  },
  actividad: {
    tabla: schema.actividades,
    columna: schema.fotos.actividadId,
    carpeta: "actividades",
    ruta: "/actividades",
    entidad: "actividades",
    falta: "Esa actividad ya no existe.",
  },
} as const;

function revalidar(d: DuenoFotos) {
  const c = config[d.tipo];
  revalidatePath(c.ruta);
  revalidatePath(`${c.ruta}/${d.id}`);
}

async function nombreDe(d: DuenoFotos) {
  const t = config[d.tipo].tabla;
  const [r] = await db.select({ nombre: t.nombre }).from(t).where(eq(t.id, d.id)).limit(1);
  return r?.nombre ?? null;
}

const dueno = (f: typeof schema.fotos.$inferSelect): DuenoFotos | null =>
  f.hotelId
    ? { tipo: "hotel", id: f.hotelId }
    : f.actividadId
      ? { tipo: "actividad", id: f.actividadId }
      : null;

async function foto(id: string) {
  const [f] = await db.select().from(schema.fotos).where(eq(schema.fotos.id, id)).limit(1);
  const d = f ? dueno(f) : null;
  return f && d ? { f, d } : null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function tocar(d: DuenoFotos, tx: Tx | typeof db = db) {
  const t = config[d.tipo].tabla;
  await tx.update(t).set({ actualizadoEn: new Date() }).where(eq(t.id, d.id));
}

const nota = (d: DuenoFotos, quien: string, texto: string, tx?: Tx) =>
  anotar({ quien, texto, entidad: config[d.tipo].entidad, entidadId: d.id }, tx);

/** Sube una o varias fotos. La portada reemplaza a la anterior, que pasa a la galería. */
export async function subirFotos(
  d: DuenoFotos,
  destino: Destino,
  f: FormData,
): Promise<{ error?: string; subidas?: number; portada?: { ancho: number; alto: number } }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const c = config[d.tipo];
  const nombre = await nombreDe(d);
  if (!nombre) return { error: c.falta };
  const habitacionId = typeof destino === "object" ? destino.habitacionId : null;
  if (habitacionId) {
    if (d.tipo !== "hotel") return { error: "Solo los hoteles tienen habitaciones." };
    const [r] = await db
      .select()
      .from(schema.hotelHabitaciones)
      .where(and(eq(schema.hotelHabitaciones.id, habitacionId), eq(schema.hotelHabitaciones.hotelId, d.id)))
      .limit(1);
    if (!r) return { error: "Esa habitación ya no existe." };
  }

  const archivos = f.getAll("fotos").filter((x): x is File => x instanceof File && x.size > 0);
  if (archivos.length === 0) return { error: "No llegó ninguna foto." };
  if (destino === "portada" && archivos.length > 1) return { error: "La portada es una sola foto." };
  if (archivos.some((a) => a.size > MAX_BYTES)) return { error: "Una de las fotos pasa de 12 MB." };

  const procesadas: Awaited<ReturnType<typeof procesarFoto>>[] = [];
  try {
    for (const a of archivos) {
      procesadas.push(await procesarFoto(`${c.carpeta}/${d.id}`, Buffer.from(await a.arrayBuffer())));
    }
  } catch (e) {
    await borrarFotos(procesadas.map((p) => p.archivo));
    if (e instanceof ErrorFoto) return { error: e.message };
    throw e;
  }

  const [{ ultimo }] = await db
    .select({ ultimo: max(schema.fotos.orden) })
    .from(schema.fotos)
    .where(eq(c.columna, d.id));
  await db.transaction(async (tx) => {
    if (destino === "portada") {
      await tx
        .update(schema.fotos)
        .set({ esPortada: false, encuadre: null, orden: -1 })
        .where(and(eq(c.columna, d.id), eq(schema.fotos.esPortada, true)));
    }
    await tx.insert(schema.fotos).values(
      procesadas.map((p, i) => ({
        hotelId: d.tipo === "hotel" ? d.id : null,
        actividadId: d.tipo === "actividad" ? d.id : null,
        habitacionId,
        archivo: p.archivo,
        ancho: p.ancho,
        alto: p.alto,
        orden: (ultimo ?? 0) + 1 + i,
        esPortada: destino === "portada",
        encuadre: destino === "portada" ? encuadreInicial(p.ancho, p.alto) : null,
        creadoPor: yo.id,
      })),
    );
    await tocar(d, tx);
    const donde = destino === "portada" ? "portada" : habitacionId ? "una habitación" : "la galería";
    await nota(
      d,
      yo.id,
      destino === "portada"
        ? `Portada nueva para ${nombre} (${procesadas[0].ancho} × ${procesadas[0].alto})`
        : `${procesadas.length} ${procesadas.length === 1 ? "foto" : "fotos"} en ${donde} de ${nombre}`,
      tx,
    );
  });
  revalidar(d);
  return {
    subidas: procesadas.length,
    portada: destino === "portada" ? { ancho: procesadas[0].ancho, alto: procesadas[0].alto } : undefined,
  };
}

export async function quitarFoto(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const r = await foto(id);
  if (!r) return {};
  await db.delete(schema.fotos).where(eq(schema.fotos.id, id));
  await borrarFotos([r.f.archivo]);
  await tocar(r.d);
  await nota(r.d, yo.id, r.f.esPortada ? "Portada quitada" : "Foto quitada");
  revalidar(r.d);
  return {};
}

/** Orden nuevo de la galería o de las fotos de una habitación (arrastrando). */
export async function ordenarFotos(ids: string[]): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  if (ids.length === 0) return {};
  const fotos = await db.select().from(schema.fotos).where(inArray(schema.fotos.id, ids));
  const d = fotos[0] ? dueno(fotos[0]) : null;
  if (!d || fotos.some((f) => f.hotelId !== fotos[0].hotelId || f.actividadId !== fotos[0].actividadId))
    return { error: "Las fotos no son de la misma ficha." };
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx.update(schema.fotos).set({ orden: i }).where(eq(schema.fotos.id, id));
    }
  });
  revalidar(d);
  return {};
}

/** Una foto de la galería pasa a ser la portada; la anterior vuelve a la galería. */
export async function usarComoPortada(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const r = await foto(id);
  if (!r || r.f.habitacionId) return { error: "Esa foto no está en la galería." };
  const { f, d } = r;
  const c = config[d.tipo];
  await db.transaction(async (tx) => {
    await tx
      .update(schema.fotos)
      .set({ esPortada: false, encuadre: null, orden: -1 })
      .where(and(eq(c.columna, d.id), eq(schema.fotos.esPortada, true)));
    await tx
      .update(schema.fotos)
      .set({ esPortada: true, encuadre: encuadreInicial(f.ancho, f.alto) })
      .where(eq(schema.fotos.id, id));
    await tocar(d, tx);
    await nota(
      d,
      yo.id,
      `Portada cambiada por una foto de la galería (${evaluarPortada(f.ancho, f.alto).titulo})`,
      tx,
    );
  });
  revalidar(d);
  return {};
}

export async function guardarEncuadre(id: string, encuadre: Encuadre): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const e = encuadreValido(encuadre);
  if (!e) return { error: "El encuadre se sale de la foto." };
  const r = await foto(id);
  if (!r?.f.esPortada) return { error: "Esa foto ya no es la portada." };
  await db.update(schema.fotos).set({ encuadre: e }).where(eq(schema.fotos.id, id));
  await tocar(r.d);
  await nota(r.d, yo.id, "Encuadre de la portada ajustado");
  revalidar(r.d);
  return {};
}
