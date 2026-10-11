// Actividades de ejemplo, las de los prototipos. Las fotos son ilustraciones
// generadas, no fotos reales; los ID en los proveedores son ficticios.

import type { drizzle } from "drizzle-orm/postgres-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as schema from "../src/lib/db/schema";
import { normalizar } from "../src/lib/texto";
import { encuadreInicial } from "../src/lib/fotos";
import type { Bloque, Cobro, Confirmacion, Horario, Llegada, TipoActividad } from "../src/lib/actividades";
import { foto } from "./semilla-hoteles";

type Db = ReturnType<typeof drizzle<typeof schema>>;

type ActividadSemilla = {
  nombre: string;
  ciudad: string;
  tipo: TipoActividad;
  duracion: string;
  descripcion?: string;
  bloques: Bloque[];
  cobro?: Cobro;
  maxGrupo?: number;
  horario?: Horario;
  horarioTexto?: string;
  salidas?: string[];
  llegada?: Llegada;
  llegadaTexto?: string;
  incluye?: string;
  noIncluye?: string;
  queLlevar?: string;
  requisitos?: string;
  confirmacion?: Confirmacion;
  nota?: string;
  planes?: [string, string][];
  boletos?: [string, number | null, number | null, boolean][];
  /** [proveedor, ID en el proveedor] */
  ligas?: [string, string | null][];
  enLugar?: boolean;
  /** Escena de la portada y de cada foto de la galería. */
  portada?: string;
  galeria?: string;
};

const BOLETOS_XCARET: ActividadSemilla["boletos"] = [
  ["Adulto", 12, null, false],
  ["Niño", 5, 11, false],
  ["Infante", 0, 4, true],
];

const ACTIVIDADES: ActividadSemilla[] = [
  {
    nombre: "Parque Xcaret",
    ciudad: "Playa del Carmen",
    tipo: "parque",
    duracion: "De 8:30 AM a 10:00 PM",
    descripcion:
      "Parque ecoarqueológico con ríos subterráneos, playa, aviario y el espectáculo México Espectacular al cierre.",
    bloques: ["cobro", "planes", "boletos", "horarios", "llegada", "incluye", "requisitos", "confirmacion"],
    cobro: "edad",
    horario: "abierto",
    horarioTexto: "Abierto de 8:30 AM a 10:00 PM",
    llegada: "por_su_cuenta",
    llegadaTexto: "Por su cuenta; se puede agregar traslado como servicio aparte.",
    incluye: "Entrada, ríos subterráneos, espectáculo nocturno",
    noIncluye: "Fotografías, propinas",
    queLlevar: "Traje de baño, bloqueador biodegradable, identificación",
    requisitos: "Tarifa nacional: identificación oficial de cada adulto y CURP o credencial de los menores.",
    confirmacion: "bono",
    nota: "Tarifa nacional: piden INE de cada adulto en la puerta. Para Plus, reservar la comida al llegar.",
    planes: [
      ["Básico", "Entrada, ríos y espectáculo"],
      ["Plus", "Básico + comida buffet y casillero"],
    ],
    boletos: BOLETOS_XCARET,
    ligas: [
      ["Grupo Xcaret", "XC-PLUS-01"],
      ["Civitatis", "34211"],
    ],
    portada: "f",
    galeria: "facfacfa",
  },
  {
    nombre: "Xel-Há",
    ciudad: "Tulum",
    tipo: "parque",
    duracion: "Todo el día",
    descripcion:
      "Parque acuático natural en una caleta, con snorkel, tirolesas y ríos para recorrer en llanta.",
    bloques: ["cobro", "planes", "boletos", "horarios", "llegada", "incluye", "requisitos", "confirmacion"],
    cobro: "edad",
    horario: "abierto",
    horarioTexto: "Abierto de 8:30 AM a 6:00 PM",
    llegada: "recogida",
    llegadaTexto: "Opcional, desde el hotel; la hora viene en el bono.",
    incluye: "Alimentos y bebidas, snorkel, casillero, toallas",
    noIncluye: "Nado con delfines, fotografías",
    queLlevar: "Traje de baño, bloqueador biodegradable",
    requisitos: "Tarifa nacional: identificación oficial de cada adulto y CURP o credencial de los menores.",
    confirmacion: "bono",
    planes: [["Todo incluido", "Alimentos, bebidas, snorkel y casillero"]],
    boletos: BOLETOS_XCARET,
    ligas: [["Grupo Xcaret", "XH-TI"]],
    portada: "a",
    galeria: "fcafca",
  },
  {
    nombre: "Tour Isla Pasión",
    ciudad: "Cozumel",
    tipo: "tour",
    duracion: "6 horas",
    descripcion: "Día de playa en una isla privada al norte de Cozumel, con barra libre y comida.",
    bloques: ["cobro", "boletos", "horarios", "llegada", "incluye", "confirmacion"],
    cobro: "edad",
    horario: "salidas",
    horarioTexto: "Salida a las 9:30 AM",
    salidas: ["09:30"],
    llegada: "punto_encuentro",
    llegadaTexto: "Muelle Puerta Maya; la dirección exacta viene en el bono.",
    incluye: "Traslado en barco, comida, barra libre",
    noIncluye: "Impuesto de muelle",
    queLlevar: "Identificación, efectivo para el impuesto de muelle",
    confirmacion: "bono",
    boletos: [
      ["Adulto", 12, null, false],
      ["Niño", 4, 11, false],
    ],
    ligas: [["Civitatis", "2214"]],
    portada: "f",
    galeria: "adfadf",
  },
  {
    nombre: "Chichén Itzá desde Cancún",
    ciudad: "Cancún",
    tipo: "excursion",
    duracion: "12 horas",
    descripcion: "Excursión de día completo a Chichén Itzá con guía, baño en un cenote y comida buffet.",
    bloques: ["cobro", "planes", "boletos", "horarios", "llegada", "incluye", "confirmacion"],
    cobro: "edad",
    horario: "salidas",
    horarioTexto: "Recogida desde las 6:30 AM",
    salidas: ["06:30"],
    llegada: "recogida",
    llegadaTexto: "Recogida en el hotel; la hora llega un día antes.",
    incluye: "Transporte, guía, entradas, comida",
    noIncluye: "Bebidas, derecho de cámara de video",
    queLlevar: "Identificación, sombrero, ropa cómoda",
    confirmacion: "bono",
    nota: "La recogida empieza muy temprano en la zona hotelera; conviene avisar al cliente un día antes.",
    planes: [
      ["Clásico", "Zona arqueológica, cenote y comida"],
      ["Con Valladolid", "Lo del Clásico más parada en Valladolid"],
    ],
    boletos: [
      ["Adulto", 12, null, false],
      ["Niño", 4, 11, false],
    ],
    ligas: [["Civitatis", "1873"]],
    portada: "e",
    galeria: "ebcebc",
  },
  {
    nombre: "Free tour por el Barrio Gótico",
    ciudad: "Barcelona",
    tipo: "tour",
    duracion: "2 horas",
    descripcion: "Recorrido guiado en español por las calles medievales del Barrio Gótico y la Catedral.",
    bloques: ["cobro", "horarios", "llegada", "incluye", "confirmacion"],
    cobro: "persona",
    horario: "salidas",
    horarioTexto: "Salidas 10:00 AM y 4:00 PM",
    salidas: ["10:00", "16:00"],
    llegada: "punto_encuentro",
    llegadaTexto: "Plaça de Catalunya, junto a la fuente.",
    incluye: "Guía en español",
    noIncluye: "Propina para el guía",
    confirmacion: "bono",
    ligas: [["Civitatis", "2051"]],
    portada: "d",
    galeria: "ebdc",
  },
  {
    nombre: "Ceremonia del té en Gion",
    ciudad: "Kioto",
    tipo: "experiencia",
    duracion: "1 hora",
    bloques: ["cobro", "horarios", "llegada", "incluye"],
    cobro: "persona",
    horario: "abierto",
    llegada: "punto_encuentro",
    llegadaTexto: "Casa de té en Gion; la dirección viene en el bono.",
    nota: "Se creó desde la cotización AIR-2472 con lo mínimo.",
    ligas: [["Civitatis", "30917"]],
  },
  {
    nombre: "Teleférico a Seceda",
    ciudad: "Val Gardena",
    tipo: "excursion",
    duracion: "Medio día",
    descripcion: "Subida en teleférico desde Ortisei a los 2,500 m de Seceda, con vista a los picos de Odle.",
    bloques: ["cobro", "horarios", "llegada", "incluye", "confirmacion"],
    cobro: "persona",
    horario: "abierto",
    horarioTexto: "Abierto de 8:30 AM a 5:30 PM",
    llegada: "por_su_cuenta",
    llegadaTexto: "Estación de Ortisei.",
    noIncluye: "El boleto se compra en la estación",
    queLlevar: "Chamarra, efectivo o tarjeta para el boleto",
    confirmacion: "pago_taquilla",
    nota: "No se reserva: va en el itinerario como recomendación con precio de referencia.",
    enLugar: true,
    portada: "e",
    galeria: "dcfed",
  },
  {
    nombre: "Tour de 3 islas",
    ciudad: "Holbox",
    tipo: "tour",
    duracion: "4 horas",
    descripcion:
      "Recorrido en lancha por Isla Pasión, Isla de los Pájaros y el cenote Yalahau, con tiempo para nadar.",
    bloques: ["cobro", "horarios", "llegada", "incluye", "confirmacion"],
    cobro: "persona",
    horario: "salidas",
    horarioTexto: "Salidas 9:00 AM y 11:00 AM",
    salidas: ["09:00", "11:00"],
    llegada: "punto_encuentro",
    llegadaTexto: "Muelle de Holbox, frente al malecón, 15 minutos antes.",
    incluye: "Lancha, guía, chalecos, agua",
    noIncluye: "Impuesto de reserva, propinas",
    queLlevar: "Traje de baño, efectivo para el impuesto",
    confirmacion: "lista_nombres",
    nota: "Solo contestan por WhatsApp. Si hay norte, reprograman sin costo.",
    ligas: [["Holbox Mar Azul", null]],
    portada: "b",
    galeria: "fbcfbc",
  },
  {
    nombre: "Day pass Mamitas Beach Club",
    ciudad: "Playa del Carmen",
    tipo: "day_pass",
    duracion: "De 9:00 AM a 6:00 PM",
    descripcion:
      "Camastro o cama balinesa frente al mar en la playa Mamitas, con alberca y consumo incluido según el pase.",
    bloques: ["cobro", "planes", "horarios", "llegada", "incluye"],
    cobro: "persona",
    horario: "abierto",
    horarioTexto: "Abierto de 9:00 AM a 6:00 PM",
    llegada: "por_su_cuenta",
    llegadaTexto: "Por su cuenta; está en la Calle 28 frente al mar.",
    incluye: "Camastro, toallas, alberca, consumo según el pase",
    noIncluye: "Propinas, consumo extra",
    queLlevar: "Identificación; se pide pulsera en la entrada",
    nota: "Se creó desde la cotización AIR-2470 con lo mínimo.",
    planes: [
      ["Camastro", "Consumo mínimo de $800 por persona"],
      ["Cama balinesa", "Hasta 4 personas · consumo de $4,000"],
    ],
    portada: "a",
    galeria: "faefa",
  },
];

export async function sembrarActividades(db: Db, admin: SupabaseClient, duenoId: string) {
  const ya = await db.select({ id: schema.actividades.id }).from(schema.actividades).limit(1);
  if (ya.length) return;
  const ciudades = await db.select().from(schema.ciudades);
  const proveedores = await db.select().from(schema.proveedores);
  const ciudad = (n: string) => {
    const c = ciudades.find((x) => x.nombre === n);
    if (!c) throw new Error(`Falta la ciudad ${n} en la semilla`);
    return c.id;
  };
  const proveedor = (n: string) => {
    const p = proveedores.find((x) => x.nombre === n);
    if (!p) throw new Error(`Falta el proveedor ${n} en la semilla`);
    return p.id;
  };

  for (const s of ACTIVIDADES) {
    const [a] = await db
      .insert(schema.actividades)
      .values({
        nombre: s.nombre,
        nombreBusqueda: normalizar(s.nombre),
        ciudadId: ciudad(s.ciudad),
        tipo: s.tipo,
        duracion: s.duracion,
        descripcion: s.descripcion ?? null,
        notaInterna: s.nota ?? null,
        sePagaEnLugar: !!s.enLugar,
        bloques: s.bloques,
        cobro: s.cobro ?? null,
        maxPersonasGrupo: s.maxGrupo ?? null,
        horarioTipo: s.horario ?? null,
        horarioTexto: s.horarioTexto ?? null,
        llegada: s.llegada ?? null,
        llegadaTexto: s.llegadaTexto ?? null,
        incluye: s.incluye ?? null,
        noIncluye: s.noIncluye ?? null,
        queLlevar: s.queLlevar ?? null,
        requisitos: s.requisitos ?? null,
        confirmacion: s.confirmacion ?? null,
        creadoPor: duenoId,
        creadoEn: new Date("2026-04-01T12:00:00-06:00"),
      })
      .returning({ id: schema.actividades.id });

    if (s.planes?.length)
      await db
        .insert(schema.actividadPlanes)
        .values(s.planes.map(([nombre, incluye], i) => ({ actividadId: a.id, nombre, incluye, orden: i })));
    if (s.boletos?.length)
      await db.insert(schema.actividadBoletos).values(
        s.boletos.map(([nombre, edadDesde, edadHasta, gratis], i) => ({
          actividadId: a.id,
          nombre,
          edadDesde,
          edadHasta,
          gratis,
          orden: i,
        })),
      );
    if (s.salidas?.length)
      await db.insert(schema.actividadSalidas).values(s.salidas.map((hora) => ({ actividadId: a.id, hora })));
    for (const [nombre, idExterno] of s.ligas ?? []) {
      await db
        .insert(schema.actividadProveedores)
        .values({ actividadId: a.id, proveedorId: proveedor(nombre), idExterno });
    }

    let orden = 0;
    if (s.portada) {
      const f = await foto(admin, `actividades/${a.id}`, s.portada, 2400, 1350);
      await db.insert(schema.fotos).values({
        actividadId: a.id,
        ...f,
        esPortada: true,
        encuadre: encuadreInicial(f.ancho, f.alto),
        orden: orden++,
        creadoPor: duenoId,
      });
    }
    for (const esc of s.galeria ?? "") {
      const f = await foto(admin, `actividades/${a.id}`, esc, 1600, 1200);
      await db.insert(schema.fotos).values({ actividadId: a.id, ...f, orden: orden++, creadoPor: duenoId });
    }
  }
}
