// Viajes de ejemplo (Fase 2): el de Nataly Cervantes de los prototipos
// (AIR-2458, Cancún, 21–27 oct) con tres opciones de hotel, y dos más con
// clientes genéricos. Todos llevan la marca «Ejemplo» y se borran juntos desde
// Configuración. Los viajes reales empiezan en AIR-1001.
//
// Se corre dentro de `npm run semilla`, y sola en una base que ya tiene equipo:
//   npx tsx scripts/semilla-viajes.ts [--forzar]
// Si ya hay viajes de ejemplo, o se borraron desde Configuración, no hace nada.

import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { normalizar } from "../src/lib/texto";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const token = () => randomBytes(32).toString("base64url");
const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000);

// La misma clave usa Configuración › Datos y horario al borrarlos.
export const CLAVE_BORRADOS = "viajes_ejemplo";

export async function sembrarViajes(db: Db, duenoId: string, modo: { local: boolean }) {
  const [ya] = await db.select({ id: schema.viajes.id }).from(schema.viajes).where(eq(schema.viajes.ejemplo, true)).limit(1);
  if (ya) return;
  const [borrados] = await db
    .select()
    .from(schema.configuracion)
    .where(eq(schema.configuracion.clave, CLAVE_BORRADOS))
    .limit(1);
  if (borrados) return;

  const ciudades = await db.select().from(schema.ciudades);
  const ciudad = (n: string) => ciudades.find((c) => c.nombre === n)?.id;
  const proveedores = await db.select().from(schema.proveedores);
  const proveedor = (n: string) => proveedores.find((p) => p.nombre === n)?.id ?? null;
  const equipo = await db.select().from(schema.usuarios);
  const persona = (n: string) => equipo.find((u) => u.nombre === n)?.id ?? duenoId;
  if (!ciudad("Cancún")) return;

  // Iberostar Selection Cancún: la opción 2 de Nataly en los prototipos.
  const hotel = async (nombre: string) =>
    (await db.select().from(schema.hoteles).where(eq(schema.hoteles.nombre, nombre)).limit(1))[0];
  let iberostar = await hotel("Iberostar Selection Cancún");
  if (!iberostar) {
    [iberostar] = await db
      .insert(schema.hoteles)
      .values({
        nombre: "Iberostar Selection Cancún",
        nombreBusqueda: normalizar("Iberostar Selection Cancún"),
        ciudadId: ciudad("Cancún")!,
        regimenes: ["AI"],
        direccion: "Blvd. Kukulcán km 17, Zona Hotelera, 77500 Cancún, Q. Roo",
        creadoPor: duenoId,
      })
      .returning();
    await db.insert(schema.hotelHabitaciones).values([
      { hotelId: iberostar.id, nombreCliente: "Deluxe vista al mar", orden: 0 },
      { hotelId: iberostar.id, nombreCliente: "Junior Suite vista al mar", orden: 1 },
    ]);
    const rh = proveedor("RateHawk");
    if (rh) await db.insert(schema.hotelProveedores).values({ hotelId: iberostar.id, proveedorId: rh, idExterno: "6014452" });
  }
  const seadust = await hotel("Seadust Cancún Family Resort");
  const adhara = await hotel("Adhara Hacienda Cancún");
  if (!seadust || !adhara) return;
  const habs = await db
    .select()
    .from(schema.hotelHabitaciones)
    .where(inArray(schema.hotelHabitaciones.hotelId, [seadust.id, iberostar.id, adhara.id]));
  const hab = (hotelId: string, nombre: string) => habs.find((h) => h.hotelId === hotelId && h.nombreCliente === nombre)!.id;

  const actividad = async (nombre: string) =>
    (await db.select().from(schema.actividades).where(eq(schema.actividades.nombre, nombre)).limit(1))[0];
  const xelha = await actividad("Xel-Há");
  const xcaret = await actividad("Parque Xcaret");
  const boletos = await db.select().from(schema.actividadBoletos);
  const planes = await db.select().from(schema.actividadPlanes);
  const boleto = (actId: string, empieza: string) =>
    boletos.find((b) => b.actividadId === actId && b.nombre.startsWith(empieza))?.id ?? null;
  const plan = (actId: string, nombre: string) =>
    planes.find((p) => p.actividadId === actId && p.nombre === nombre)?.id ?? null;

  const servicio = async (nombre: string) =>
    (await db.select().from(schema.servicios).where(eq(schema.servicios.nombre, nombre)).limit(1))[0];
  const traslado = await servicio("Traslado privado · Aeropuerto de Cancún");
  const seguro = await servicio("Seguro de viaje");
  const variantes = await db.select().from(schema.servicioVariantes);
  const variante = (sId: string, n: string) => variantes.find((v) => v.servicioId === sId && v.nombre === n)?.id ?? null;

  const [viva] = await db.select().from(schema.aerolineas).where(eq(schema.aerolineas.iata, "VB")).limit(1);
  const [switchT] = viva
    ? await db
        .select()
        .from(schema.aerolineaTarifas)
        .where(and(eq(schema.aerolineaTarifas.aerolineaId, viva.id), eq(schema.aerolineaTarifas.nombre, "Switch")))
        .limit(1)
    : [];

  // Tipo de cambio del día, solo en local: en producción lo trae Banxico o lo captura el Dueño.
  if (modo.local) {
    const hoy = new Date().toISOString().slice(0, 10);
    await db
      .insert(schema.tiposCambio)
      .values([
        { fecha: hoy, moneda: "USD", diezmilesimos: 18_4200, fuente: "manual", capturadoPor: duenoId },
        { fecha: hoy, moneda: "EUR", diezmilesimos: 20_1500, fuente: "manual", capturadoPor: duenoId },
      ])
      .onConflictDoNothing();
  }

  const cliente = async (nombre: string, whatsapp: string) =>
    (
      await db
        .insert(schema.clientes)
        .values({ nombre, nombreBusqueda: normalizar(nombre), whatsapp, ejemplo: true, creadoPor: duenoId })
        .returning()
    )[0];

  const cotizacion = async (viajeId: string, estado: "borrador" | "enviada", validaHasta: string) =>
    (
      await db
        .insert(schema.cotizaciones)
        .values({
          viajeId,
          version: 1,
          estado,
          validaHasta,
          utilidadBasePb: 1000,
          ivaPb: 1600,
          cargoServicioCentavos: 250_00,
          colchonPb: 150,
          notas: {},
          enviadaEn: estado === "enviada" ? hace(96) : null,
          enviadaPor: estado === "enviada" ? duenoId : null,
          creadoPor: duenoId,
        })
        .returning()
    )[0];

  const eventos = (viajeId: string, lista: [number, string, string, string | null][]) =>
    db.insert(schema.viajeEventos).values(
      lista.map(([horas, tipo, texto, etiqueta]) => ({
        viajeId,
        tipo,
        texto,
        etiqueta,
        quien: duenoId,
        creadoEn: hace(horas),
      })),
    );

  // ─── Nataly Cervantes · AIR-2458 ─────────────────────────────────────────
  const nataly = await cliente("Nataly Cervantes", "+52 998 214 7730");
  const [v1] = await db
    .insert(schema.viajes)
    .values({
      folio: 2458,
      clienteId: nataly.id,
      aCargo: duenoId,
      ciudadDestinoId: ciudad("Cancún")!,
      ciudadSalidaId: ciudad("Guadalajara") ?? null,
      inicio: "2026-10-21",
      fin: "2026-10-27",
      adultos: 4,
      menores: 2,
      edadesMenores: [9, 6],
      tokenCliente: token(),
      ejemplo: true,
      creadoPor: duenoId,
      creadoEn: hace(72),
    })
    .returning();
  const c1 = await cotizacion(v1.id, "borrador", "2026-10-13");
  await db
    .update(schema.cotizaciones)
    .set({
      notas: {
        hospedaje:
          "Elegimos estos hoteles por ser los más family-friendly de la zona, con club infantil y alberca con juegos, ideales para viajar con niños.",
      },
    })
    .where(eq(schema.cotizaciones.id, c1.id));
  const opciones = await db
    .insert(schema.cotizacionOpciones)
    .values([
      { cotizacionId: c1.id, orden: 0, recomendada: true },
      { cotizacionId: c1.id, orden: 1 },
      { cotizacionId: c1.id, orden: 2 },
    ])
    .returning();

  const partida = async (p: Omit<typeof schema.partidas.$inferInsert, "cotizacionId">) =>
    (await db.insert(schema.partidas).values({ ...p, cotizacionId: c1.id, creadoPor: duenoId }).returning())[0];

  const hoteles: [typeof seadust, string, string, number, string, string | null][] = [
    // hotel, habitación, cama, costo neto total (2 habitaciones), régimen, opción
    [seadust, "Suite Deluxe", "2 dobles", 22_000_00, "AI", opciones[0].id],
    [iberostar, "Deluxe vista al mar", "2 dobles", 40_636_36, "AI", opciones[1].id],
    [adhara, "Deluxe con vista a la ciudad", "2 dobles", 17_000_00, "BB", opciones[2].id],
  ];
  for (const [i, [h, habitacion, cama, neto, regimen, opcionId]] of hoteles.entries()) {
    const p = await partida({
      tipo: "hotel",
      opcionId,
      orden: i,
      hotelId: h.id,
      proveedorId: proveedor("RateHawk"),
      regimen,
      fechaInicio: "2026-10-21",
      fechaFin: "2026-10-27",
      netoTotalCentavos: neto,
      utilidadPb: 1000,
      reembolsable: true,
      cancelacionGratisHasta: "2026-10-15",
      pagarAntes: "2026-10-14",
    });
    await db.insert(schema.partidaHabitaciones).values(
      [0, 1].map((orden) => ({
        partidaId: p.id,
        habitacionId: hab(h.id, habitacion),
        cama,
        adultos: 2,
        menores: 1,
        orden,
      })),
    );
  }

  let tramoIda: string | null = null;
  let tramoRegreso: string | null = null;
  if (viva) {
    const v = await partida({
      tipo: "vuelo",
      orden: 10,
      aerolineaId: viva.id,
      tarifaId: switchT?.id ?? null,
      fechaInicio: "2026-10-21",
      fechaFin: "2026-10-27",
      netoTotalCentavos: 2_683_00,
      utilidadPb: 250,
      utilidadManual: true,
      detalle: { redondo: true, pasajeros: 6, tua: "GDL $727 · CUN $382" },
    });
    const tramos = await db
      .insert(schema.vueloTramos)
      .values([
        {
          partidaId: v.id,
          sentido: "ida",
          orden: 0,
          numero: "VB 2124",
          fecha: "2026-10-21",
          origen: "GDL",
          destino: "CUN",
          terminalLlegada: "T2",
          // Hora local de cada aeropuerto: Guadalajara va una hora atrás de Cancún.
          sale: "16:55",
          llega: "20:26",
        },
        {
          partidaId: v.id,
          sentido: "regreso",
          orden: 1,
          numero: "VB 2125",
          fecha: "2026-10-27",
          origen: "CUN",
          destino: "GDL",
          terminalSalida: "T2",
          sale: "18:13",
          llega: "19:45",
        },
      ])
      .returning();
    tramoIda = tramos[0].id;
    tramoRegreso = tramos[1].id;
  }

  const actividades: [typeof xelha | undefined, string, string, number][] = [
    // actividad, plan, fecha, costo neto total (4 adultos y 2 niños)
    [xelha, "Todo incluido", "2026-10-22", 4_364_00],
    [xcaret, "Plus", "2026-10-24", 5_836_36],
  ];
  for (const [i, [a, nombrePlan, fecha, neto]] of actividades.entries()) {
    if (!a) continue;
    const p = await partida({
      tipo: "actividad",
      orden: 20 + i,
      actividadId: a.id,
      planId: plan(a.id, nombrePlan),
      proveedorId: proveedor("Grupo Xcaret"),
      fechaInicio: fecha,
      netoTotalCentavos: neto,
      utilidadPb: 1000,
      pagoProveedor: i === 0 ? "anticipo" : "al_reservar",
      anticipoProveedorPb: i === 0 ? 2500 : 0,
      detalle: {
        duracion: a.duracion ?? "Todo el día",
        inclusiones: [a.incluye ? `Incluye: ${a.incluye}` : "", a.noIncluye ? `No incluye: ${a.noIncluye}` : ""]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await db.insert(schema.partidaRenglones).values([
      { partidaId: p.id, concepto: "Adulto", boletoId: boleto(a.id, "Adulto"), cantidad: 4, orden: 0 },
      { partidaId: p.id, concepto: "Niño", boletoId: boleto(a.id, "Niño"), cantidad: 2, orden: 1 },
    ]);
  }

  if (traslado) {
    const p = await partida({
      tipo: "servicio",
      orden: 30,
      servicioId: traslado.id,
      varianteId: variante(traslado.id, "Van adaptada"),
      fechaInicio: "2026-10-21",
      fechaFin: "2026-10-27",
      netoTotalCentavos: 2_400_00,
      utilidadPb: 1000,
      detalle: { recoleccion: "redondo", duracionAprox: "30–40 min", personas: 6 },
    });
    await db.insert(schema.partidaTrayectos).values([
      { partidaId: p.id, orden: 0, desde: "Aeropuerto CUN", hasta: "Hotel", fecha: "2026-10-21", hora: "20:45", vueloTramoId: tramoIda },
      { partidaId: p.id, orden: 1, desde: "Hotel", hasta: "Aeropuerto CUN", fecha: "2026-10-27", hora: "15:30", vueloTramoId: tramoRegreso },
    ]);
  }
  if (seguro) {
    await partida({
      tipo: "servicio",
      orden: 31,
      servicioId: seguro.id,
      varianteId: variante(seguro.id, "Plus"),
      proveedorId: proveedor("Assist Card"),
      fechaInicio: "2026-10-21",
      fechaFin: "2026-10-27",
      // $180 por persona × 6: el sistema solo guarda el total.
      netoTotalCentavos: 1_080_00,
      utilidadPb: 1000,
      detalle: { cobertura: "Nacional", personas: 6, mayores70: 0 },
    });
  }
  await eventos(v1.id, [
    [72, "creado", "Se creó el viaje", null],
    [50, "borrador", "Se editó el borrador", "Vuelos"],
    [3, "borrador", "Se editó el borrador", "Hospedaje"],
    [20, "nota", "Nataly prefiere hoteles con club infantil; Sofía no come mariscos.", "Nota interna"],
  ]);

  // ─── Cliente de ejemplo · Holbox, con el cliente ─────────────────────────
  const tortugas = await hotel("Casa Las Tortugas");
  if (tortugas && ciudad("Holbox")) {
    const cl = await cliente("Cliente de ejemplo", "+52 998 100 0101");
    const [v2] = await db
      .insert(schema.viajes)
      .values({
        folio: 2441,
        clienteId: cl.id,
        aCargo: persona("Asesora 1"),
        ciudadDestinoId: ciudad("Holbox")!,
        inicio: "2026-11-12",
        fin: "2026-11-15",
        adultos: 2,
        tokenCliente: token(),
        ejemplo: true,
        creadoPor: duenoId,
        creadoEn: hace(120),
      })
      .returning();
    const c2 = await cotizacion(v2.id, "enviada", "2026-10-16");
    const [habTortugas] = await db
      .select()
      .from(schema.hotelHabitaciones)
      .where(eq(schema.hotelHabitaciones.hotelId, tortugas.id))
      .limit(1);
    const [p] = await db
      .insert(schema.partidas)
      .values({
        cotizacionId: c2.id,
        tipo: "hotel",
        hotelId: tortugas.id,
        proveedorId: proveedor("RateHawk"),
        regimen: tortugas.regimenes[0] ?? "BB",
        fechaInicio: "2026-11-12",
        fechaFin: "2026-11-15",
        netoTotalCentavos: 18_500_00,
        utilidadPb: 1200,
        utilidadManual: true,
        reembolsable: true,
        cancelacionGratisHasta: "2026-11-01",
        pagarAntes: "2026-10-30",
        creadoPor: duenoId,
      })
      .returning();
    if (habTortugas)
      await db.insert(schema.partidaHabitaciones).values({
        partidaId: p.id,
        habitacionId: habTortugas.id,
        cama: "King",
        adultos: 2,
        menores: 0,
      });
    await eventos(v2.id, [
      [120, "creado", "Se creó el viaje", null],
      [96, "envio", "Se envió la cotización", "Por WhatsApp"],
    ]);
  }

  // ─── Cliente de ejemplo 2 · Mérida, borrador sin costo ───────────────────
  const lecanda = await hotel("Casa Lecanda");
  if (lecanda && ciudad("Mérida")) {
    const cl = await cliente("Cliente de ejemplo 2", "+52 999 100 0102");
    const [v3] = await db
      .insert(schema.viajes)
      .values({
        folio: 2433,
        clienteId: cl.id,
        aCargo: duenoId,
        ciudadDestinoId: ciudad("Mérida")!,
        ciudadSalidaId: ciudad("Ciudad de México") ?? null,
        inicio: "2026-12-03",
        fin: "2026-12-07",
        adultos: 2,
        tokenCliente: token(),
        ejemplo: true,
        creadoPor: duenoId,
        creadoEn: hace(26),
      })
      .returning();
    const c3 = await cotizacion(v3.id, "borrador", "2026-10-17");
    const [habLecanda] = await db
      .select()
      .from(schema.hotelHabitaciones)
      .where(eq(schema.hotelHabitaciones.hotelId, lecanda.id))
      .limit(1);
    const [p] = await db
      .insert(schema.partidas)
      .values({
        cotizacionId: c3.id,
        tipo: "hotel",
        hotelId: lecanda.id,
        proveedorId: proveedor("RateHawk"),
        regimen: "BB",
        fechaInicio: "2026-12-03",
        fechaFin: "2026-12-07",
        utilidadPb: 1000,
        creadoPor: duenoId,
      })
      .returning();
    if (habLecanda)
      await db.insert(schema.partidaHabitaciones).values({
        partidaId: p.id,
        habitacionId: habLecanda.id,
        cama: "King",
        adultos: 2,
        menores: 0,
      });
    await eventos(v3.id, [
      [26, "creado", "Se creó el viaje", null],
      [25, "borrador", "Se editó el borrador", "Hospedaje"],
    ]);
  }
}

// ─── Correr sola ────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith("semilla-viajes.ts")) {
  (async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local" });
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const local = /127\.0\.0\.1|localhost/.test(url);
    if (!local && !process.argv.includes("--forzar")) {
      console.error("La semilla es para la base local. Usa --forzar si de verdad quieres otra.");
      process.exit(1);
    }
    const conexion = postgres(process.env.DATABASE_URL!, { prepare: false });
    const db = drizzle(conexion, { schema, casing: "snake_case" });
    const [dueno] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.rol, "dueno")).limit(1);
    if (dueno) await sembrarViajes(db, dueno.id, { local });
    await conexion.end();
    console.log(dueno ? "Viajes de ejemplo listos." : "Sin dueño todavía; no se siembran viajes.");
  })();
}
