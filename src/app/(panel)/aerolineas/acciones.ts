"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { viajesQueUsan } from "@/lib/catalogos";
import { anotar } from "@/lib/bitacora";
import { limpiarIata, RUTAS, textoFuente, type Fuente, type Ruta } from "@/lib/aerolineas";
import { usuarioCon } from "@/lib/sesion";
import { limpiar } from "@/lib/texto";

const RUTA = "/aerolineas";
const SIN_PERMISO = "Tu rol puede consultar aerolíneas, pero no cambiarlas.";
const COMO_SE_COMPRA = "En su sitio, con la forma de pago que ofrezca";

async function aerolinea(id: string) {
  const [a] = await db.select().from(schema.aerolineas).where(eq(schema.aerolineas.id, id)).limit(1);
  return a ?? null;
}

// ─── Alta ────────────────────────────────────────────────────────────────────

export type ResultadoAlta = { error: string } | { id: string };

/**
 * Agrega una aerolínea al catálogo. Con un código de la lista IATA el nombre
 * sale de ahí; si no está en la lista, se escribe a mano.
 */
export async function agregarAerolinea(codigo: string, nombreAMano = ""): Promise<ResultadoAlta> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const iata = limpiarIata(codigo);
  if (!iata) return { error: "El código IATA son dos letras o números, como VB o Y4." };

  const [ya] = await db.select().from(schema.aerolineas).where(eq(schema.aerolineas.iata, iata)).limit(1);
  if (ya)
    return {
      error: ya.archivadoEn
        ? `${ya.nombre} (${iata}) ya está en el catálogo, archivada. Se puede reactivar desde Archivadas.`
        : `${ya.nombre} (${iata}) ya está en el catálogo.`,
    };

  const [ref] = await db
    .select()
    .from(schema.aerolineasIata)
    .where(eq(schema.aerolineasIata.iata, iata))
    .limit(1);
  const nombre = limpiar(nombreAMano) || ref?.nombre || "";
  if (nombre.length < 2) return { error: `${iata} no está en la lista IATA; falta escribir el nombre.` };
  if (nombre.length > 80) return { error: "El nombre lleva hasta 80 caracteres." };

  const id = await db.transaction(async (tx) => {
    const [nueva] = await tx
      .insert(schema.aerolineas)
      .values({ iata, nombre, comoSeCompra: COMO_SE_COMPRA, creadoPor: yo.id })
      .returning({ id: schema.aerolineas.id });
    await tx
      .insert(schema.aerolineaCheckin)
      .values(RUTAS.map((r) => ({ aerolineaId: nueva.id, ruta: r.valor, fuente: "sin_fuente" as const })));
    await anotar(
      {
        quien: yo.id,
        texto: `Aerolínea agregada: ${nombre} (${iata})`,
        entidad: "aerolineas",
        entidadId: nueva.id,
      },
      tx,
    );
    return nueva.id;
  });
  revalidatePath(RUTA);
  return { id };
}

// ─── Edición desde el panel ──────────────────────────────────────────────────

const opcional = (max: number, msg: string) =>
  z
    .string()
    .nullish()
    .transform((v) => limpiar(v ?? "") || null)
    .pipe(z.string().max(max, msg).nullable());

const Tarifa = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(1, "Falta el nombre de una tarifa.").max(40)),
  mano: opcional(40, "El equipaje de mano lleva hasta 40 caracteres."),
  documentada: opcional(40, "El equipaje documentado lleva hasta 40 caracteres."),
  cambios: opcional(60, "Los cambios llevan hasta 60 caracteres."),
});

const Ventana = z.object({
  ruta: z.enum(["nacional", "internacional"]),
  abre: opcional(60, "La apertura del check-in lleva hasta 60 caracteres."),
  cierra: opcional(60, "El cierre del check-in lleva hasta 60 caracteres."),
  fuente: z.enum(["verificado", "terceros", "sin_fuente"]),
  fuenteTexto: opcional(60, "La fuente lleva hasta 60 caracteres."),
});

const Datos = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre.").max(80)),
  sitio: opcional(120, "El sitio lleva hasta 120 caracteres."),
  comoSeCompra: opcional(200, "Cómo se compra lleva hasta 200 caracteres."),
  notaInterna: opcional(1000, "La nota lleva hasta 1000 caracteres."),
  tarifas: z.array(Tarifa).max(12, "Hasta 12 tarifas por aerolínea."),
  checkin: z.array(Ventana).length(2),
});

export type DatosAerolinea = z.input<typeof Datos>;

/**
 * Guarda tarifas, check-in y cómo se compra. Una ventana verificada sigue
 * verificada mientras sus horas no cambien; si cambian, vuelve a su fuente.
 */
export async function guardarAerolinea(id: string, datos: DatosAerolinea): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const antes = await aerolinea(id);
  if (!antes) return { error: "Esa aerolínea ya no está en el catálogo." };
  const p = Datos.safeParse(datos);
  if (!p.success) return { error: p.error.issues[0].message };
  const { tarifas, checkin, ...d } = p.data;
  const previas = await db
    .select()
    .from(schema.aerolineaCheckin)
    .where(eq(schema.aerolineaCheckin.aerolineaId, id));

  await db.transaction(async (tx) => {
    await tx
      .update(schema.aerolineas)
      .set({ ...d, actualizadoEn: new Date() })
      .where(eq(schema.aerolineas.id, id));
    await tx.delete(schema.aerolineaTarifas).where(eq(schema.aerolineaTarifas.aerolineaId, id));
    if (tarifas.length)
      await tx
        .insert(schema.aerolineaTarifas)
        .values(tarifas.map((t, orden) => ({ ...t, aerolineaId: id, orden })));
    for (const v of checkin) {
      const previa = previas.find((x) => x.ruta === v.ruta);
      const sigueVerificada =
        previa?.fuente === "verificado" && previa.abre === v.abre && previa.cierra === v.cierra;
      const fuente: Fuente = sigueVerificada
        ? "verificado"
        : v.fuente === "verificado"
          ? "terceros"
          : v.fuente;
      const valores = {
        abre: v.abre,
        cierra: v.cierra,
        fuente,
        fuenteTexto: fuente === "terceros" ? v.fuenteTexto : null,
        verificadoPor: sigueVerificada ? previa.verificadoPor : null,
        verificadoEn: sigueVerificada ? previa.verificadoEn : null,
      };
      if (previa)
        await tx
          .update(schema.aerolineaCheckin)
          .set(valores)
          .where(eq(schema.aerolineaCheckin.id, previa.id));
      else await tx.insert(schema.aerolineaCheckin).values({ ...valores, aerolineaId: id, ruta: v.ruta });
    }
    await anotar(
      {
        quien: yo.id,
        texto: `Aerolínea ${d.nombre} guardada`,
        entidad: "aerolineas",
        entidadId: id,
        antes: { nombre: antes.nombre },
        despues: { nombre: d.nombre, tarifas: tarifas.map((t) => t.nombre) },
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return {};
}

/** «Marcar verificado»: alguien del equipo confirmó la ventana con una reserva real. */
export async function marcarVerificado(
  id: string,
  ruta: Ruta,
): Promise<{ error?: string; mensaje?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const a = await aerolinea(id);
  if (!a) return { error: "Esa aerolínea ya no está en el catálogo." };
  const [v] = await db
    .select()
    .from(schema.aerolineaCheckin)
    .where(and(eq(schema.aerolineaCheckin.aerolineaId, id), eq(schema.aerolineaCheckin.ruta, ruta)))
    .limit(1);
  if (!v?.abre || !v.cierra)
    return {
      error: "Faltan la apertura y el cierre de esa ruta; se capturan con «Editar» antes de verificar.",
    };
  if (v.fuente === "verificado") return {};
  await db
    .update(schema.aerolineaCheckin)
    .set({ fuente: "verificado", verificadoPor: yo.id, verificadoEn: new Date() })
    .where(eq(schema.aerolineaCheckin.id, v.id));
  await anotar({
    quien: yo.id,
    texto: `Check-in ${ruta} de ${a.nombre} verificado (antes: ${textoFuente(v).toLowerCase()})`,
    entidad: "aerolineas",
    entidadId: id,
  });
  revalidatePath(RUTA);
  return { mensaje: "Ventana verificada · el check-in asistido usará esta hora" };
}

// ─── Archivar y eliminar ─────────────────────────────────────────────────────

export async function archivarAerolinea(
  id: string,
  archivar: boolean,
  motivo = "",
): Promise<{ error?: string }> {
  const yo = await usuarioCon("archivar_catalogos");
  if (!yo) return { error: "Tu rol no archiva aerolíneas." };
  const a = await aerolinea(id);
  if (!a || !!a.archivadoEn === archivar) return {};
  await db
    .update(schema.aerolineas)
    .set({
      archivadoEn: archivar ? new Date() : null,
      archivadoPor: archivar ? yo.id : null,
      motivoArchivo: archivar ? limpiar(motivo) || null : null,
      actualizadoEn: new Date(),
    })
    .where(eq(schema.aerolineas.id, id));
  await anotar({
    quien: yo.id,
    texto: archivar
      ? `Aerolínea archivada: ${a.nombre}${limpiar(motivo) ? ` · ${limpiar(motivo)}` : ""}`
      : `Aerolínea reactivada: ${a.nombre}`,
    entidad: "aerolineas",
    entidadId: id,
  });
  revalidatePath(RUTA);
  return {};
}

/** Viajes que usan la aerolínea. Los vuelos de cotización llegan en la Fase 2. */
const viajesDeAerolinea = (id: string) => viajesQueUsan("aerolineaId", id);

export async function eliminarAerolinea(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("eliminar_catalogos");
  if (!yo) return { error: "Solo el dueño elimina aerolíneas. Se puede archivar." };
  const a = await aerolinea(id);
  if (!a) return {};
  const viajes = await viajesDeAerolinea(id);
  if (viajes > 0)
    return {
      error: `Se usó en ${viajes} ${viajes === 1 ? "viaje" : "viajes"}, así que no se puede eliminar; se puede archivar.`,
    };
  await db.transaction(async (tx) => {
    await tx.delete(schema.aerolineas).where(eq(schema.aerolineas.id, id));
    await anotar(
      {
        quien: yo.id,
        texto: `Aerolínea eliminada: ${a.nombre} (${a.iata})`,
        entidad: "aerolineas",
        entidadId: id,
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return {};
}
