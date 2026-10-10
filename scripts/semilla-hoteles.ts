// Hoteles de ejemplo, los de los prototipos. Las fotos son ilustraciones
// generadas (cielo, mar y arena), no fotos reales de los hoteles; los
// teléfonos y los ID de Tripadvisor son ficticios.

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as schema from "../src/lib/db/schema";
import { normalizar } from "../src/lib/texto";
import { encuadreInicial } from "../src/lib/fotos";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Paletas de las ilustraciones: cielo arriba, abajo mar o tierra.
const ESCENAS: Record<string, [string, string, string, string]> = {
  a: ["#7fb8ea", "#cfe6f7", "#e9dcc0", "#e2d1ad"], // playa
  b: ["#9aa9c4", "#d6dde9", "#cbbfa6", "#b9ab8f"], // nublado
  c: ["#8fc9b0", "#d9efe3", "#6f9d7c", "#557f61"], // jardín
  d: ["#f0a65a", "#f7d9a6", "#2f6f9a", "#24577a"], // atardecer
  e: ["#d9a6a0", "#f3dcd6", "#5f8c72", "#4c735c"], // montaña
  f: ["#5fb7c9", "#c4ecf2", "#e8dcc2", "#dccca8"], // mar turquesa
};

async function ilustracion(escena: string, ancho: number, alto: number): Promise<Buffer> {
  const [c1, c2, t1, t2] = ESCENAS[escena];
  const h = Math.round(alto * 0.55);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">
    <defs>
      <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="suelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t1}"/><stop offset="1" stop-color="${t2}"/></linearGradient>
    </defs>
    <rect width="${ancho}" height="${h}" fill="url(#cielo)"/>
    <rect y="${h}" width="${ancho}" height="${alto - h}" fill="url(#suelo)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function guardar(admin: SupabaseClient, ruta: string, datos: Buffer) {
  if (process.env.ALMACEN_FOTOS === "supabase") {
    const { error } = await admin.storage.from("fotos").upload(ruta, datos, { contentType: "image/webp" });
    if (error) throw error;
    return;
  }
  const destino = path.join(process.cwd(), ".almacen", "fotos", ruta);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, datos);
}

/** Igual que la subida del panel: webp grande (2400) y chica (600). */
async function foto(admin: SupabaseClient, hotelId: string, escena: string, ancho: number, alto: number) {
  const original = await ilustracion(escena, ancho, alto);
  const grande = await sharp(original)
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const chica = await sharp(original)
    .resize({ width: 600, height: 600, fit: "inside" })
    .webp({ quality: 78 })
    .toBuffer();
  const archivo = `hoteles/${hotelId}/${randomUUID()}`;
  await guardar(admin, `${archivo}-g.webp`, grande.data);
  await guardar(admin, `${archivo}-c.webp`, chica);
  return { archivo, ancho: grande.info.width, alto: grande.info.height };
}

type Hab = { nombre: string; fotos: string; nombres: [string, string][] };
type HotelSemilla = {
  nombre: string;
  ciudad: string;
  regimenes: string[];
  descripcion?: string;
  direccion?: string;
  ligaMaps?: string;
  telefono?: string;
  tripadvisor?: [string, number, number];
  llegada?: string;
  salida?: string;
  menores?: [number, number];
  anticipada?: string;
  reglas?: string;
  reservaciones?: string;
  correo?: string;
  nota?: string;
  portada?: [string, number, number];
  galeria?: string;
  habitaciones?: Hab[];
  cargos?: [string, number, "MXN" | "USD" | "EUR", "habitacion_noche" | "persona_noche" | "estancia"][];
  sinCargos?: boolean;
  donde?: [string, string | null][];
  archivado?: string;
};

const HOTELES: HotelSemilla[] = [
  {
    nombre: "Seadust Cancún Family Resort",
    ciudad: "Cancún",
    regimenes: ["AI"],
    descripcion:
      "En el km 16.5 de la Zona Hotelera, con acceso directo a la playa. Albercas con zona infantil, parque acuático, Kids Club, diez centros de consumo y espectáculos nocturnos.",
    direccion: "Blvd. Kukulcán km 16.5, Zona Hotelera, 77500 Cancún, Q. Roo",
    ligaMaps: "https://maps.app.goo.gl/sd8Kq2",
    telefono: "+52 998 100 0201",
    tripadvisor: ["1234517", 45, 3106],
    llegada: "15:00",
    salida: "12:00",
    menores: [3, 12],
    anticipada:
      "Puedes dejar las maletas y usar las albercas desde tu llegada; la habitación se entrega a las 3:00 PM.",
    reglas:
      "Se pide identificación oficial y tarjeta de crédito para el depósito de incidentales al registrarse. No se aceptan mascotas.",
    reservaciones: "+52 998 100 0202",
    correo: "reservaciones@seadust.example",
    nota: "Pedir habitación en piso alto para vista al mar; la recepción la asigna al llegar. Con niños menores de 3, pedir cuna al reservar.",
    portada: ["f", 2400, 1350],
    galeria: "adbceda",
    habitaciones: [
      {
        nombre: "Suite Deluxe",
        fotos: "adc",
        nombres: [
          ["RateHawk", "Family Deluxe Room 2 Double Beds"],
          ["TBO Holidays", "FAMILY DLX 2DB"],
          ["RateHawk", "Deluxe Family Room"],
        ],
      },
      {
        nombre: "Suite Deluxe vista al mar",
        fotos: "baf",
        nombres: [
          ["RateHawk", "Family Deluxe Ocean View 2 Double"],
          ["TBO Holidays", "FAMILY DLX OV"],
        ],
      },
      {
        nombre: "Junior Suite",
        fotos: "ec",
        nombres: [
          ["RateHawk", "Junior Suite King"],
          ["TBO Holidays", "JR SUITE KG"],
        ],
      },
      {
        nombre: "Suite familiar 2 recámaras",
        fotos: "",
        nombres: [
          ["RateHawk", "Two Bedroom Family Suite"],
          ["TBO Holidays", "FAM STE 2BR"],
        ],
      },
    ],
    cargos: [["Derecho de saneamiento ambiental", 6900, "MXN", "habitacion_noche"]],
    donde: [
      ["RateHawk", "6011734"],
      ["TBO Holidays", "1043920"],
    ],
  },
  {
    nombre: "Adhara Hacienda Cancún",
    ciudad: "Cancún",
    regimenes: ["BB"],
    descripcion:
      "Hacienda de estilo colonial en el centro de Cancún, a 10 minutos de la zona hotelera. Alberca con jardín, restaurante de cocina yucateca y traslado gratuito a la playa.",
    direccion: "Av. Sayil 6, SM 4, 77500 Cancún, Q. Roo",
    ligaMaps: "https://maps.app.goo.gl/adh2",
    telefono: "+52 998 100 0211",
    tripadvisor: ["302410", 40, 2287],
    llegada: "15:00",
    salida: "12:00",
    reservaciones: "+52 998 100 0212",
    portada: ["a", 2400, 1350],
    galeria: "fdcab",
    habitaciones: [
      { nombre: "Deluxe con vista a la ciudad", fotos: "ab", nombres: [["RateHawk", "Deluxe City View"]] },
      { nombre: "Junior Suite", fotos: "c", nombres: [["RateHawk", "Junior Suite"]] },
      { nombre: "Suite familiar", fotos: "d", nombres: [["RateHawk", "Family Suite"]] },
    ],
    cargos: [["Derecho de saneamiento ambiental", 6900, "MXN", "habitacion_noche"]],
    donde: [["RateHawk", "6620184"]],
  },
  {
    nombre: "Casa Mexicana San Cristóbal",
    ciudad: "San Cristóbal de las Casas",
    regimenes: ["BB"],
    descripcion:
      "Casona colonial a dos cuadras del andador, con patio interior y chimenea en las habitaciones.",
    direccion: "28 de Agosto 1, Centro, 29200 San Cristóbal de las Casas, Chis.",
    ligaMaps: "https://maps.app.goo.gl/csc1",
    telefono: "+52 967 100 0221",
    llegada: "15:00",
    salida: "12:00",
    reservaciones: "+52 967 100 0222",
    nota: "Para grupos, pide la lista de huéspedes 15 días antes.",
    portada: ["e", 2000, 1125],
    galeria: "ecbad",
    habitaciones: [
      { nombre: "Estándar", fotos: "e", nombres: [["Casa Mexicana San Cristóbal", "Estándar matrimonial"]] },
      { nombre: "Superior", fotos: "c", nombres: [["Casa Mexicana San Cristóbal", "Superior 2 dobles"]] },
      { nombre: "Suite", fotos: "b", nombres: [["Casa Mexicana San Cristóbal", "Suite King"]] },
      { nombre: "Familiar", fotos: "a", nombres: [["Casa Mexicana San Cristóbal", "Familiar"]] },
    ],
    sinCargos: true,
    donde: [["Casa Mexicana San Cristóbal", null]],
  },
  {
    nombre: "Casa Las Tortugas",
    ciudad: "Holbox",
    regimenes: ["BB"],
    descripcion:
      "Hotel boutique frente a la playa, con cabañas de techo de palma y restaurante sobre la arena.",
    direccion: "Calle Escualo s/n, 77310 Holbox, Q. Roo",
    ligaMaps: "https://maps.app.goo.gl/tor1",
    telefono: "+52 984 100 0231",
    tripadvisor: ["1786623", 45, 2031],
    llegada: "15:00",
    salida: "11:00",
    reservaciones: "+52 984 100 0232",
    portada: ["f", 2400, 1350],
    galeria: "facbd",
    habitaciones: [
      { nombre: "Cabaña frente al mar", fotos: "f", nombres: [["RateHawk", "Beachfront Cabana"]] },
      { nombre: "Suite jardín", fotos: "c", nombres: [["RateHawk", "Garden Suite"]] },
      { nombre: "Villa familiar", fotos: "a", nombres: [["RateHawk", "Family Villa"]] },
    ],
    cargos: [["Impuesto de visitante a Holbox", 5000, "MXN", "persona_noche"]],
    donde: [["RateHawk", "6702215"]],
  },
  {
    nombre: "Dreams Tulum Resort & Spa",
    ciudad: "Tulum",
    regimenes: ["AI"],
    descripcion:
      "Todo incluido frente al mar, a 15 minutos de la zona arqueológica, con club infantil y siete restaurantes.",
    direccion: "Carretera Cancún-Tulum km 234, 77780 Tulum, Q. Roo",
    ligaMaps: "https://maps.app.goo.gl/dre1",
    telefono: "+52 984 100 0241",
    tripadvisor: ["1021358", 45, 6540],
    llegada: "15:00",
    salida: "12:00",
    reservaciones: "+52 984 100 0242",
    portada: ["d", 2400, 1350],
    galeria: "fdaecb",
    habitaciones: [
      { nombre: "Deluxe vista al jardín", fotos: "c", nombres: [["RateHawk", "Deluxe Garden View"]] },
      { nombre: "Deluxe vista al mar", fotos: "f", nombres: [["RateHawk", "Deluxe Ocean View"]] },
      { nombre: "Preferred Club Suite", fotos: "d", nombres: [["RateHawk", "Preferred Club Junior Suite"]] },
    ],
    donde: [["RateHawk", "6015530"]],
  },
  {
    nombre: "Casa Lecanda",
    ciudad: "Mérida",
    regimenes: ["BB"],
    descripcion:
      "Casona restaurada sobre el Paseo de Montejo, con siete habitaciones y alberca en el patio central.",
    direccion: "Paseo de Montejo 481, Centro, 97000 Mérida, Yuc.",
    ligaMaps: "https://maps.app.goo.gl/lec1",
    telefono: "+52 999 100 0251",
    tripadvisor: ["2247781", 50, 688],
    llegada: "15:00",
    salida: "12:00",
    reservaciones: "+52 999 100 0252",
    portada: ["e", 2400, 1350],
    galeria: "ecabd",
    habitaciones: [
      { nombre: "Habitación patio", fotos: "e", nombres: [["RateHawk", "Patio Room King"]] },
      { nombre: "Suite con alberca", fotos: "f", nombres: [["RateHawk", "Pool Suite"]] },
    ],
    sinCargos: true,
    donde: [["RateHawk", "6839902"]],
  },
  {
    nombre: "Garni Dolomiti",
    ciudad: "Val Gardena",
    regimenes: ["BB"],
    descripcion:
      "Casa de huéspedes familiar al pie del Sassolungo, con desayuno tirolés y transporte a los teleféricos.",
    direccion: "Strada Dursan 12, 39047 Santa Cristina Valgardena, Italia",
    ligaMaps: "https://maps.app.goo.gl/gar1",
    telefono: "+39 335 100 0261",
    tripadvisor: ["4410235", 50, 412],
    llegada: "14:00",
    salida: "10:00",
    reservaciones: "+39 335 100 0262",
    nota: "Responde por WhatsApp en inglés o italiano.",
    portada: ["e", 1080, 1080],
    galeria: "c",
    habitaciones: [
      { nombre: "Doble con balcón", fotos: "e", nombres: [["TBO Holidays", "DBL BALCONY"]] },
      { nombre: "Apartamento familiar", fotos: "c", nombres: [["TBO Holidays", "FAMILY APT 2BR"]] },
    ],
    cargos: [["Impuesto de estancia", 250, "EUR", "persona_noche"]],
    donde: [["TBO Holidays", "1188402"]],
  },
  {
    nombre: "Hotel Arts Barcelona",
    ciudad: "Barcelona",
    regimenes: ["RO", "BB"],
    descripcion:
      "Torre frente a la playa de la Barceloneta, junto al Puerto Olímpico, con alberca exterior y spa en los pisos altos.",
    direccion: "Carrer de la Marina 19-21, 08005 Barcelona, España",
    ligaMaps: "https://maps.app.goo.gl/art1",
    telefono: "+34 932 100 0271",
    tripadvisor: ["190166", 45, 3544],
    llegada: "15:00",
    salida: "12:00",
    reservaciones: "+34 932 100 0272",
    portada: ["d", 2400, 1350],
    galeria: "dfbaec",
    habitaciones: [
      { nombre: "Deluxe vista a la ciudad", fotos: "b", nombres: [["TBO Holidays", "DLX CITY VIEW"]] },
      {
        nombre: "Deluxe vista al mar",
        fotos: "f",
        nombres: [
          ["TBO Holidays", "DLX SEA VIEW"],
          ["RateHawk", "Deluxe Sea View"],
        ],
      },
      { nombre: "Club Suite", fotos: "", nombres: [["RateHawk", "Club Suite"]] },
    ],
    cargos: [["Tasa turística de Barcelona", 750, "EUR", "persona_noche"]],
    donde: [
      ["TBO Holidays", "1182337"],
      ["RateHawk", "7710245"],
    ],
  },
  {
    nombre: "Park Hyatt Kioto",
    ciudad: "Kioto",
    regimenes: ["RO", "BB"],
    tripadvisor: ["14187236", 50, 1102],
    nota: "Se creó desde una cotización con lo mínimo.",
    donde: [["RateHawk", "8806571"]],
  },
  {
    nombre: "Hard Rock Riviera Maya",
    ciudad: "Puerto Aventuras",
    regimenes: ["AI"],
    descripcion: "Todo incluido para adultos y familias en Puerto Aventuras.",
    telefono: "+52 984 100 0291",
    tripadvisor: ["150813", 40, 12480],
    llegada: "15:00",
    salida: "11:00",
    portada: ["a", 2400, 1350],
    galeria: "afb",
    habitaciones: [{ nombre: "Deluxe Gold", fotos: "a", nombres: [["RateHawk", "Deluxe Gold"]] }],
    donde: [["RateHawk", "6003318"]],
    archivado: "Ya no lo ofrecemos por quejas de servicio en 2026.",
  },
];

export async function sembrarHoteles(db: Db, admin: SupabaseClient, duenoId: string) {
  const ya = await db.select({ id: schema.hoteles.id }).from(schema.hoteles).limit(1);
  if (ya.length) return;
  const ciudades = await db.select().from(schema.ciudades);
  const proveedores = await db.select().from(schema.proveedores);
  const ciudad = (n: string) => ciudades.find((c) => c.nombre === n)!.id;
  const proveedor = (n: string) => {
    const p = proveedores.find((x) => x.nombre === n);
    if (!p) throw new Error(`Falta el proveedor ${n} en la semilla`);
    return p.id;
  };

  for (const s of HOTELES) {
    const [h] = await db
      .insert(schema.hoteles)
      .values({
        nombre: s.nombre,
        nombreBusqueda: normalizar(s.nombre),
        ciudadId: ciudad(s.ciudad),
        regimenes: s.regimenes,
        descripcion: s.descripcion ?? null,
        direccion: s.direccion ?? null,
        ligaMaps: s.ligaMaps ?? null,
        telefonoPublico: s.telefono ?? null,
        tripadvisorId: s.tripadvisor?.[0] ?? null,
        tripadvisorCalificacion: s.tripadvisor?.[1] ?? null,
        tripadvisorOpiniones: s.tripadvisor?.[2] ?? null,
        tripadvisorActualizadoEn: s.tripadvisor ? new Date("2026-10-01T12:00:00-05:00") : null,
        llegadaDesde: s.llegada ?? null,
        salidaHasta: s.salida ?? null,
        edadMenoresDe: s.menores?.[0] ?? null,
        edadMenoresA: s.menores?.[1] ?? null,
        llegadaAnticipada: s.anticipada ?? null,
        reglas: s.reglas ?? null,
        telefonoReservaciones: s.reservaciones ?? null,
        correoReservaciones: s.correo ?? null,
        notaInterna: s.nota ?? null,
        sinCargos: !!s.sinCargos,
        archivadoEn: s.archivado ? new Date("2026-03-15T12:00:00-06:00") : null,
        archivadoPor: s.archivado ? duenoId : null,
        motivoArchivo: s.archivado ?? null,
        creadoPor: duenoId,
        creadoEn: new Date("2026-03-01T12:00:00-06:00"),
      })
      .returning({ id: schema.hoteles.id });

    let orden = 0;
    if (s.portada) {
      const [esc, an, al] = s.portada;
      const f = await foto(admin, h.id, esc, an, al);
      await db.insert(schema.fotos).values({
        hotelId: h.id,
        ...f,
        esPortada: true,
        encuadre: encuadreInicial(f.ancho, f.alto),
        orden: orden++,
        creadoPor: duenoId,
      });
    }
    for (const esc of s.galeria ?? "") {
      const f = await foto(admin, h.id, esc, 1600, 1200);
      await db.insert(schema.fotos).values({ hotelId: h.id, ...f, orden: orden++, creadoPor: duenoId });
    }
    for (const [i, r] of (s.habitaciones ?? []).entries()) {
      const [hab] = await db
        .insert(schema.hotelHabitaciones)
        .values({ hotelId: h.id, nombreCliente: r.nombre, orden: i })
        .returning({ id: schema.hotelHabitaciones.id });
      for (const esc of r.fotos) {
        const f = await foto(admin, h.id, esc, 1600, 1200);
        await db
          .insert(schema.fotos)
          .values({ hotelId: h.id, habitacionId: hab.id, ...f, orden: orden++, creadoPor: duenoId });
      }
      if (r.nombres.length)
        await db
          .insert(schema.hotelHabitacionNombres)
          .values(
            r.nombres.map(([p, nombre]) => ({ habitacionId: hab.id, proveedorId: proveedor(p), nombre })),
          );
    }
    if (s.cargos?.length)
      await db.insert(schema.hotelCargos).values(
        s.cargos.map(([concepto, montoCentavos, moneda, seCobra], i) => ({
          hotelId: h.id,
          concepto,
          montoCentavos,
          moneda,
          seCobra,
          orden: i,
        })),
      );
    for (const [p, idExterno] of s.donde ?? []) {
      await db
        .insert(schema.hotelProveedores)
        .values({ hotelId: h.id, proveedorId: proveedor(p), idExterno });
    }
    await db
      .insert(schema.bitacora)
      .values({
        quien: duenoId,
        texto: `Hotel agregado: ${s.nombre} (${s.ciudad})`,
        entidad: "hoteles",
        entidadId: h.id,
        cuando: new Date("2026-03-01T12:00:00-06:00"),
      });
  }
}
