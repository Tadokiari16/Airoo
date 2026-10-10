"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { aCentavos, MONEDAS } from "@/lib/dinero";
import { CLAVES_REGIMEN, idTripadvisor, SE_COBRA } from "@/lib/hoteles";
import { borrarFotos } from "@/lib/imagenes";
import { usuarioCon } from "@/lib/sesion";
import { limpiar, normalizar } from "@/lib/texto";
import { hotelesParecidos, type HotelParecido } from "./datos";

const RUTA = "/hoteles";
const SIN_PERMISO = "Tu rol puede consultar hoteles, pero no cambiarlos.";

function revalidar(id?: string) {
  revalidatePath(RUTA);
  if (id) revalidatePath(`${RUTA}/${id}`);
}

async function hotel(id: string) {
  const [h] = await db.select().from(schema.hoteles).where(eq(schema.hoteles.id, id)).limit(1);
  return h ?? null;
}

const tocar = (id: string) =>
  db.update(schema.hoteles).set({ actualizadoEn: new Date() }).where(eq(schema.hoteles.id, id));

// ─── Alta ────────────────────────────────────────────────────────────────────

export type ResultadoAlta = { error: string } | { parecidos: HotelParecido[] } | { id: string } | undefined;

export async function crearHotel(_: ResultadoAlta, f: FormData): Promise<ResultadoAlta> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const nombre = limpiar(String(f.get("nombre") ?? ""));
  const ciudadId = String(f.get("ciudadId") ?? "");
  if (nombre.length < 2) return { error: "Falta el nombre del hotel." };
  if (!ciudadId) return { error: "Falta elegir la ciudad de la lista." };
  const [ciudad] = await db
    .select()
    .from(schema.ciudades)
    .where(and(eq(schema.ciudades.id, ciudadId), isNull(schema.ciudades.archivadoEn)))
    .limit(1);
  if (!ciudad) return { error: "Esa ciudad ya no está en la lista." };

  if (f.get("confirmar") !== "si") {
    const parecidos = await hotelesParecidos(nombre);
    if (parecidos.length > 0) return { parecidos };
  }

  const [nuevo] = await db
    .insert(schema.hoteles)
    .values({ nombre, nombreBusqueda: normalizar(nombre), ciudadId, creadoPor: yo.id })
    .returning({ id: schema.hoteles.id });
  await anotar({
    quien: yo.id,
    texto: `Hotel agregado: ${nombre} (${ciudad.nombre})`,
    entidad: "hoteles",
    entidadId: nuevo.id,
  });
  revalidar();
  return { id: nuevo.id };
}

// ─── Ficha ───────────────────────────────────────────────────────────────────

const opcional = (max: number, msg: string) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(max, msg))
    .transform((v) => v || null);

const hora = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => !v || /^\d{2}:\d{2}$/.test(v), "La hora no tiene un formato válido.")
  .transform((v) => v || null);

const edad = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => !v || /^\d{1,2}$/.test(v), "La edad de menores va en años, del 0 al 17.")
  .transform((v) => (v ? Number(v) : null));

const Cargo = z.object({
  concepto: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el concepto del cargo.")),
  monto: z.string(),
  moneda: z.enum(MONEDAS),
  seCobra: z.enum(SE_COBRA.map((s) => s.valor) as [string, ...string[]]),
});

const Donde = z.object({
  proveedorId: z.uuid("Falta elegir la plataforma o el proveedor."),
  idExterno: z.string().transform((v) => limpiar(v) || null),
});

const Ficha = z.object({
  nombre: z.string().transform(limpiar).pipe(z.string().min(2, "Falta el nombre del hotel.")),
  ciudadId: z.uuid("Falta elegir la ciudad de la lista."),
  regimenes: z
    .array(z.enum(CLAVES_REGIMEN as [string, ...string[]]))
    .min(1, "Falta elegir al menos un régimen."),
  descripcion: opcional(400, "La descripción lleva hasta 400 caracteres."),
  direccion: opcional(300, "La dirección es demasiado larga."),
  ligaMaps: z
    .string()
    .transform((v) => v.trim())
    .refine(
      (v) => !v || /^https?:\/\/\S+$/.test(v) || /^maps\.app\.goo\.gl\//.test(v),
      "La liga de Google Maps empieza con https://.",
    )
    .transform((v) => (v ? (v.startsWith("http") ? v : `https://${v}`) : null)),
  telefonoPublico: opcional(40, "El teléfono es demasiado largo."),
  tripadvisor: z.string(),
  tripadvisorCalificacion: z
    .string()
    .refine((v) => !v || /^[1-5](\.[05])?$/.test(v), "La calificación de Tripadvisor va de 1.0 a 5.0.")
    .transform((v) => (v ? Math.round(Number(v) * 10) : null)),
  tripadvisorOpiniones: z
    .string()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .refine((v) => !v || /^\d{1,7}$/.test(v), "El número de opiniones va sin letras.")
    .transform((v) => (v ? Number(v) : null)),
  llegadaDesde: hora,
  salidaHasta: hora,
  edadMenoresDe: edad,
  edadMenoresA: edad,
  llegadaAnticipada: opcional(400, "La llegada anticipada lleva hasta 400 caracteres."),
  reglas: opcional(800, "Las reglas llevan hasta 800 caracteres."),
  telefonoReservaciones: opcional(40, "El teléfono de reservaciones es demasiado largo."),
  correoReservaciones: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.union([z.literal(""), z.email("El correo de reservaciones no tiene un formato válido.")]))
    .transform((v) => v || null),
  notaInterna: opcional(1000, "La nota lleva hasta 1000 caracteres."),
  sinCargos: z.boolean(),
  cargos: z.array(Cargo),
  donde: z.array(Donde),
});

export type ResultadoFicha = { error: string } | { guardado: number } | undefined;

export async function guardarFicha(id: string, _: ResultadoFicha, f: FormData): Promise<ResultadoFicha> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const antes = await hotel(id);
  if (!antes) return { error: "Ese hotel ya no existe." };

  const json = (k: string) => {
    try {
      return JSON.parse(String(f.get(k) ?? "[]"));
    } catch {
      return [];
    }
  };
  const texto = (k: string) => String(f.get(k) ?? "");
  const p = Ficha.safeParse({
    nombre: texto("nombre"),
    ciudadId: texto("ciudadId"),
    regimenes: f.getAll("regimenes"),
    descripcion: texto("descripcion"),
    direccion: texto("direccion"),
    ligaMaps: texto("ligaMaps"),
    telefonoPublico: texto("telefonoPublico"),
    tripadvisor: texto("tripadvisor"),
    tripadvisorCalificacion: texto("tripadvisorCalificacion"),
    tripadvisorOpiniones: texto("tripadvisorOpiniones"),
    llegadaDesde: texto("llegadaDesde"),
    salidaHasta: texto("salidaHasta"),
    edadMenoresDe: texto("edadMenoresDe"),
    edadMenoresA: texto("edadMenoresA"),
    llegadaAnticipada: texto("llegadaAnticipada"),
    reglas: texto("reglas"),
    telefonoReservaciones: texto("telefonoReservaciones"),
    correoReservaciones: texto("correoReservaciones"),
    notaInterna: texto("notaInterna"),
    sinCargos: f.get("sinCargos") === "si",
    cargos: json("cargos"),
    donde: json("donde"),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;

  const taId = d.tripadvisor.trim() ? idTripadvisor(d.tripadvisor) : null;
  if (d.tripadvisor.trim() && !taId)
    return {
      error: "El ID de Tripadvisor es el número que va después de «-d» en la dirección de su página.",
    };
  if (d.edadMenoresDe !== null && d.edadMenoresA !== null && d.edadMenoresDe > d.edadMenoresA)
    return { error: "En la edad de menores, la primera edad va antes que la segunda." };
  if ((d.edadMenoresA ?? 0) > 17) return { error: "La edad de menores va en años, del 0 al 17." };

  const cargos: (z.infer<typeof Cargo> & { montoCentavos: number })[] = [];
  for (const c of d.cargos) {
    const centavos = aCentavos(c.monto);
    if (centavos === null || centavos <= 0)
      return { error: `El monto de «${c.concepto}» no es un monto válido.` };
    cargos.push({ ...c, montoCentavos: centavos });
  }
  const proveedores = new Set<string>();
  for (const x of d.donde) {
    if (proveedores.has(x.proveedorId))
      return { error: "Un proveedor aparece dos veces en «Dónde se puede reservar»." };
    proveedores.add(x.proveedorId);
  }

  const cambioTa =
    taId !== antes.tripadvisorId ||
    d.tripadvisorCalificacion !== antes.tripadvisorCalificacion ||
    d.tripadvisorOpiniones !== antes.tripadvisorOpiniones;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.hoteles)
      .set({
        nombre: d.nombre,
        nombreBusqueda: normalizar(d.nombre),
        ciudadId: d.ciudadId,
        regimenes: CLAVES_REGIMEN.filter((r) => d.regimenes.includes(r)),
        descripcion: d.descripcion,
        direccion: d.direccion,
        ligaMaps: d.ligaMaps,
        telefonoPublico: d.telefonoPublico,
        tripadvisorId: taId,
        tripadvisorCalificacion: d.tripadvisorCalificacion,
        tripadvisorOpiniones: d.tripadvisorOpiniones,
        tripadvisorActualizadoEn: cambioTa ? new Date() : antes.tripadvisorActualizadoEn,
        llegadaDesde: d.llegadaDesde,
        salidaHasta: d.salidaHasta,
        edadMenoresDe: d.edadMenoresDe,
        edadMenoresA: d.edadMenoresA,
        llegadaAnticipada: d.llegadaAnticipada,
        reglas: d.reglas,
        telefonoReservaciones: d.telefonoReservaciones,
        correoReservaciones: d.correoReservaciones,
        notaInterna: d.notaInterna,
        sinCargos: cargos.length === 0 && d.sinCargos,
        actualizadoEn: new Date(),
      })
      .where(eq(schema.hoteles.id, id));

    await tx.delete(schema.hotelCargos).where(eq(schema.hotelCargos.hotelId, id));
    if (cargos.length)
      await tx.insert(schema.hotelCargos).values(
        cargos.map((c, i) => ({
          hotelId: id,
          concepto: c.concepto,
          montoCentavos: c.montoCentavos,
          moneda: c.moneda,
          seCobra: c.seCobra as "habitacion_noche" | "persona_noche" | "estancia",
          orden: i,
        })),
      );

    // Dónde se puede reservar: se conservan los renglones que siguen (por proveedor).
    const actuales = await tx
      .select()
      .from(schema.hotelProveedores)
      .where(eq(schema.hotelProveedores.hotelId, id));
    const quedan = new Set(d.donde.map((x) => x.proveedorId));
    const quitar = actuales.filter((a) => !quedan.has(a.proveedorId)).map((a) => a.id);
    if (quitar.length)
      await tx.delete(schema.hotelProveedores).where(inArray(schema.hotelProveedores.id, quitar));
    for (const x of d.donde) {
      await tx
        .insert(schema.hotelProveedores)
        .values({ hotelId: id, proveedorId: x.proveedorId, idExterno: x.idExterno })
        .onConflictDoUpdate({
          target: [schema.hotelProveedores.hotelId, schema.hotelProveedores.proveedorId],
          set: { idExterno: x.idExterno },
        });
    }

    await anotar(
      {
        quien: yo.id,
        texto: `Ficha de ${d.nombre} guardada`,
        entidad: "hoteles",
        entidadId: id,
        antes: {
          nombre: antes.nombre,
          regimenes: antes.regimenes,
          tripadvisor: antes.tripadvisorCalificacion,
        },
        despues: { nombre: d.nombre, regimenes: d.regimenes, tripadvisor: d.tripadvisorCalificacion },
      },
      tx,
    );
  });
  revalidar(id);
  return { guardado: Date.now() };
}

// ─── Habitaciones ────────────────────────────────────────────────────────────

const nombreHabitacion = z
  .string()
  .transform(limpiar)
  .pipe(z.string().min(2, "Falta el nombre que verá el cliente.").max(80, "El nombre es demasiado largo."));

export async function agregarHabitacion(hotelId: string, nombre: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const n = nombreHabitacion.safeParse(nombre);
  if (!n.success) return { error: n.error.issues[0].message };
  const h = await hotel(hotelId);
  if (!h) return { error: "Ese hotel ya no existe." };
  const [{ ultimo }] = await db
    .select({ ultimo: max(schema.hotelHabitaciones.orden) })
    .from(schema.hotelHabitaciones)
    .where(eq(schema.hotelHabitaciones.hotelId, hotelId));
  await db
    .insert(schema.hotelHabitaciones)
    .values({ hotelId, nombreCliente: n.data, orden: (ultimo ?? -1) + 1 });
  await tocar(hotelId);
  await anotar({
    quien: yo.id,
    texto: `Habitación agregada: ${n.data}`,
    entidad: "hoteles",
    entidadId: hotelId,
  });
  revalidar(hotelId);
  return {};
}

export async function renombrarHabitacion(id: string, nombre: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const n = nombreHabitacion.safeParse(nombre);
  if (!n.success) return { error: n.error.issues[0].message };
  const [r] = await db
    .update(schema.hotelHabitaciones)
    .set({ nombreCliente: n.data })
    .where(eq(schema.hotelHabitaciones.id, id))
    .returning();
  if (!r) return {};
  await tocar(r.hotelId);
  await anotar({
    quien: yo.id,
    texto: `Habitación renombrada: ${n.data}`,
    entidad: "hoteles",
    entidadId: r.hotelId,
  });
  revalidar(r.hotelId);
  return {};
}

export async function quitarHabitacion(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const [r] = await db
    .select()
    .from(schema.hotelHabitaciones)
    .where(eq(schema.hotelHabitaciones.id, id))
    .limit(1);
  if (!r) return {};
  const fotos = await db
    .select({ archivo: schema.fotos.archivo })
    .from(schema.fotos)
    .where(eq(schema.fotos.habitacionId, id));
  // Fotos y nombres de proveedor se borran con ella (en cascada).
  await db.delete(schema.hotelHabitaciones).where(eq(schema.hotelHabitaciones.id, id));
  await borrarFotos(fotos.map((f) => f.archivo));
  await tocar(r.hotelId);
  await anotar({
    quien: yo.id,
    texto: `Habitación quitada: ${r.nombreCliente}`,
    entidad: "hoteles",
    entidadId: r.hotelId,
  });
  revalidar(r.hotelId);
  return {};
}

export async function agregarNombreProveedor(
  habitacionId: string,
  proveedorId: string,
  nombre: string,
): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const n = limpiar(nombre);
  if (n.length < 2) return { error: "Falta el nombre tal como aparece en la tarifa del proveedor." };
  if (!z.uuid().safeParse(proveedorId).success) return { error: "Falta elegir el proveedor." };
  const [r] = await db
    .select()
    .from(schema.hotelHabitaciones)
    .where(eq(schema.hotelHabitaciones.id, habitacionId))
    .limit(1);
  if (!r) return { error: "Esa habitación ya no existe." };
  const [p] = await db
    .select({ nombre: schema.proveedores.nombre })
    .from(schema.proveedores)
    .where(eq(schema.proveedores.id, proveedorId))
    .limit(1);
  if (!p) return { error: "Ese proveedor ya no existe." };
  const repetido = await db
    .select({ id: schema.hotelHabitacionNombres.id })
    .from(schema.hotelHabitacionNombres)
    .where(
      and(
        eq(schema.hotelHabitacionNombres.habitacionId, habitacionId),
        eq(schema.hotelHabitacionNombres.proveedorId, proveedorId),
        sql`lower(${schema.hotelHabitacionNombres.nombre}) = lower(${n})`,
      ),
    );
  if (repetido.length) return { error: "Ese nombre ya está en esta habitación." };
  await db.insert(schema.hotelHabitacionNombres).values({ habitacionId, proveedorId, nombre: n });
  await tocar(r.hotelId);
  await anotar({
    quien: yo.id,
    texto: `Nombre de ${p.nombre} para «${r.nombreCliente}»: ${n}`,
    entidad: "hoteles",
    entidadId: r.hotelId,
  });
  revalidar(r.hotelId);
  return {};
}

export async function quitarNombreProveedor(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("editar_catalogos");
  if (!yo) return { error: SIN_PERMISO };
  const [n] = await db
    .select({ n: schema.hotelHabitacionNombres, hotelId: schema.hotelHabitaciones.hotelId })
    .from(schema.hotelHabitacionNombres)
    .innerJoin(
      schema.hotelHabitaciones,
      eq(schema.hotelHabitaciones.id, schema.hotelHabitacionNombres.habitacionId),
    )
    .where(eq(schema.hotelHabitacionNombres.id, id))
    .limit(1);
  if (!n) return {};
  await db.delete(schema.hotelHabitacionNombres).where(eq(schema.hotelHabitacionNombres.id, id));
  await tocar(n.hotelId);
  await anotar({
    quien: yo.id,
    texto: `Nombre de proveedor quitado: ${n.n.nombre}`,
    entidad: "hoteles",
    entidadId: n.hotelId,
  });
  revalidar(n.hotelId);
  return {};
}

// ─── Archivar, eliminar y unir ───────────────────────────────────────────────

export async function archivarHotel(id: string, archivar: boolean, motivo = ""): Promise<{ error?: string }> {
  const yo = await usuarioCon("archivar_catalogos");
  if (!yo) return { error: "Tu rol no archiva hoteles." };
  const h = await hotel(id);
  if (!h || !!h.archivadoEn === archivar) return {};
  await db
    .update(schema.hoteles)
    .set({
      archivadoEn: archivar ? new Date() : null,
      archivadoPor: archivar ? yo.id : null,
      motivoArchivo: archivar ? limpiar(motivo) || null : null,
      actualizadoEn: new Date(),
    })
    .where(eq(schema.hoteles.id, id));
  await anotar({
    quien: yo.id,
    texto: archivar
      ? `Hotel archivado: ${h.nombre}${limpiar(motivo) ? ` · ${limpiar(motivo)}` : ""}`
      : `Hotel reactivado: ${h.nombre}`,
    entidad: "hoteles",
    entidadId: id,
  });
  revalidar(id);
  return {};
}

/** Viajes que usan el hotel. Las partidas de cotización llegan en la Fase 2. */
async function viajesDeHotel(id: string): Promise<number> {
  void id;
  return 0;
}

export async function eliminarHotel(id: string): Promise<{ error?: string }> {
  const yo = await usuarioCon("eliminar_catalogos");
  if (!yo) return { error: "Solo el dueño elimina hoteles. Se puede archivar." };
  const h = await hotel(id);
  if (!h) return {};
  const viajes = await viajesDeHotel(id);
  if (viajes > 0)
    return {
      error: `Se usó en ${viajes} ${viajes === 1 ? "viaje" : "viajes"}, así que no se puede eliminar; se puede archivar.`,
    };
  const fotos = await db
    .select({ archivo: schema.fotos.archivo })
    .from(schema.fotos)
    .where(eq(schema.fotos.hotelId, id));
  await db.transaction(async (tx) => {
    await tx.delete(schema.hoteles).where(eq(schema.hoteles.id, id));
    await anotar(
      { quien: yo.id, texto: `Hotel eliminado: ${h.nombre}`, entidad: "hoteles", entidadId: id },
      tx,
    );
  });
  await borrarFotos(fotos.map((f) => f.archivo));
  revalidar();
  return {};
}

/**
 * «Unir con otro hotel», para duplicados: las fotos, habitaciones, cargos y
 * plataformas del otro pasan a este, y el otro queda archivado como unido.
 * En la Fase 2 también pasan sus viajes.
 */
export async function unirHoteles(
  esteId: string,
  otroId: string,
): Promise<{ error?: string; mensaje?: string }> {
  const yo = await usuarioCon("eliminar_catalogos");
  if (!yo) return { error: "Solo el dueño une hoteles duplicados." };
  if (esteId === otroId) return { error: "Se elige otro hotel, no el mismo." };
  const [este, otro] = await Promise.all([hotel(esteId), hotel(otroId)]);
  if (!este || !otro || otro.unidoA) return { error: "Ese hotel ya no existe o ya se unió con otro." };

  let pasaron = { fotos: 0, habitaciones: 0 };
  await db.transaction(async (tx) => {
    const tienePortada = await tx
      .select({ id: schema.fotos.id })
      .from(schema.fotos)
      .where(and(eq(schema.fotos.hotelId, esteId), eq(schema.fotos.esPortada, true)));
    if (tienePortada.length) {
      // Solo queda una portada: la del otro pasa a la galería.
      await tx
        .update(schema.fotos)
        .set({ esPortada: false, encuadre: null })
        .where(and(eq(schema.fotos.hotelId, otroId), eq(schema.fotos.esPortada, true)));
    }
    const fotos = await tx
      .update(schema.fotos)
      .set({ hotelId: esteId, orden: sql`${schema.fotos.orden} + 1000` })
      .where(eq(schema.fotos.hotelId, otroId))
      .returning({ id: schema.fotos.id });
    const habs = await tx
      .update(schema.hotelHabitaciones)
      .set({ hotelId: esteId, orden: sql`${schema.hotelHabitaciones.orden} + 1000` })
      .where(eq(schema.hotelHabitaciones.hotelId, otroId))
      .returning({ id: schema.hotelHabitaciones.id });
    pasaron = { fotos: fotos.length, habitaciones: habs.length };

    const susCargos = await tx
      .select()
      .from(schema.hotelCargos)
      .where(eq(schema.hotelCargos.hotelId, esteId));
    if (susCargos.length === 0)
      await tx
        .update(schema.hotelCargos)
        .set({ hotelId: esteId })
        .where(eq(schema.hotelCargos.hotelId, otroId));

    // Plataformas: las que este ya tiene se quedan con su ID.
    const ya = await tx
      .select({ p: schema.hotelProveedores.proveedorId })
      .from(schema.hotelProveedores)
      .where(eq(schema.hotelProveedores.hotelId, esteId));
    const tiene = new Set(ya.map((y) => y.p));
    const delOtro = await tx
      .select()
      .from(schema.hotelProveedores)
      .where(eq(schema.hotelProveedores.hotelId, otroId));
    for (const d of delOtro) {
      if (!tiene.has(d.proveedorId))
        await tx
          .update(schema.hotelProveedores)
          .set({ hotelId: esteId })
          .where(eq(schema.hotelProveedores.id, d.id));
    }

    // Lo que este no tiene se toma del otro.
    const completar: Partial<typeof schema.hoteles.$inferInsert> = {};
    for (const k of [
      "descripcion",
      "direccion",
      "ligaMaps",
      "telefonoPublico",
      "tripadvisorId",
      "tripadvisorCalificacion",
      "tripadvisorOpiniones",
      "llegadaDesde",
      "salidaHasta",
      "llegadaAnticipada",
      "reglas",
      "telefonoReservaciones",
      "correoReservaciones",
    ] as const) {
      if (este[k] == null && otro[k] != null) Object.assign(completar, { [k]: otro[k] });
    }
    await tx
      .update(schema.hoteles)
      .set({
        ...completar,
        regimenes: CLAVES_REGIMEN.filter((r) => este.regimenes.includes(r) || otro.regimenes.includes(r)),
        actualizadoEn: new Date(),
      })
      .where(eq(schema.hoteles.id, esteId));
    await tx
      .update(schema.hoteles)
      .set({
        unidoA: esteId,
        archivadoEn: otro.archivadoEn ?? new Date(),
        archivadoPor: yo.id,
        motivoArchivo: `Unido con ${este.nombre}`,
        actualizadoEn: new Date(),
      })
      .where(eq(schema.hoteles.id, otroId));
    await anotar(
      {
        quien: yo.id,
        texto: `${otro.nombre} se unió con ${este.nombre}: pasaron ${pasaron.fotos} fotos y ${pasaron.habitaciones} habitaciones`,
        entidad: "hoteles",
        entidadId: esteId,
      },
      tx,
    );
    await anotar(
      { quien: yo.id, texto: `Unido con ${este.nombre}`, entidad: "hoteles", entidadId: otroId },
      tx,
    );
  });
  revalidar(esteId);
  return {
    mensaje: `${otro.nombre} se unió con este hotel · pasaron ${pasaron.fotos} fotos y ${pasaron.habitaciones} habitaciones`,
  };
}
