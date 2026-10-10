"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { usuarioCon } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";
import { buscarParecidas, usosDeCiudad, type Parecida } from "./datos";

const RUTA = "/configuracion/ciudades";

export type { Parecida };
export type ResultadoCiudad =
  | { error: string }
  | { parecidas: Parecida[]; datos: { nombre: string; region: string; pais: string } }
  | { creada: string }
  | undefined;

const Ciudad = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre de la ciudad.")),
  region: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el estado o la región.")),
  pais: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el país.")),
  confirmar: z.string().optional(),
});

export async function agregarCiudad(_: ResultadoCiudad, datos: FormData): Promise<ResultadoCiudad> {
  const yo = await usuarioCon("configuracion");
  if (!yo) return { error: "Solo el dueño agrega ciudades a la lista." };

  const p = Ciudad.safeParse(Object.fromEntries(datos));
  if (!p.success) return { error: p.error.issues[0].message };
  const { nombre, region, pais, confirmar } = p.data;
  const nombreBusqueda = normalizar(nombre);

  const [igual] = await db
    .select({ id: schema.ciudades.id, archivadoEn: schema.ciudades.archivadoEn })
    .from(schema.ciudades)
    .where(
      and(
        eq(schema.ciudades.nombreBusqueda, nombreBusqueda),
        sql`lower(${schema.ciudades.region}) = lower(${region})`,
        sql`lower(${schema.ciudades.pais}) = lower(${pais})`,
      ),
    )
    .limit(1);
  if (igual) {
    return {
      error: igual.archivadoEn
        ? `${nombre}, ${region} ya está en la lista, archivada. Se puede reactivar.`
        : `${nombre}, ${region} ya está en la lista.`,
    };
  }

  if (confirmar !== "si") {
    const parecidas = await buscarParecidas(nombre);
    if (parecidas.length > 0) return { parecidas, datos: { nombre, region, pais } };
  }

  const [nueva] = await db
    .insert(schema.ciudades)
    .values({ nombre, region, pais, nombreBusqueda, creadoPor: yo.id })
    .returning({ id: schema.ciudades.id });
  await anotar({
    quien: yo.id,
    texto: `Ciudad agregada: ${nombre}, ${region}, ${pais}`,
    entidad: "ciudades",
    entidadId: nueva.id,
  });
  revalidatePath(RUTA);
  return { creada: `${nombre}, ${region}` };
}

export async function archivarCiudad(id: string, archivar: boolean) {
  const yo = await usuarioCon("configuracion");
  if (!yo) return;
  const [c] = await db.select().from(schema.ciudades).where(eq(schema.ciudades.id, id)).limit(1);
  if (!c || !!c.archivadoEn === archivar) return;

  await db
    .update(schema.ciudades)
    .set({ archivadoEn: archivar ? new Date() : null, actualizadoEn: new Date() })
    .where(eq(schema.ciudades.id, id));
  await anotar({
    quien: yo.id,
    texto: `${archivar ? "Ciudad archivada" : "Ciudad reactivada"}: ${c.nombre}, ${c.region}`,
    entidad: "ciudades",
    entidadId: id,
  });
  revalidatePath(RUTA);
}

export async function eliminarCiudad(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("configuracion");
  if (!yo) return { error: "Solo el dueño administra la lista de ciudades." };
  const [c] = await db.select().from(schema.ciudades).where(eq(schema.ciudades.id, id)).limit(1);
  if (!c) return {};
  const usos = await usosDeCiudad(id);
  if (usos > 0) return { error: `No se puede eliminar: se usa en ${usos} registros. Se puede archivar.` };
  await db.delete(schema.ciudades).where(eq(schema.ciudades.id, id));
  await anotar({
    quien: yo.id,
    texto: `Ciudad eliminada: ${c.nombre}, ${c.region}`,
    entidad: "ciudades",
    entidadId: id,
  });
  revalidatePath(RUTA);
  return {};
}
