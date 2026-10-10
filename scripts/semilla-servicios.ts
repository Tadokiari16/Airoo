// Servicios de ejemplo, los del prototipo de Servicios. Los ID en los
// proveedores son ficticios.

import type { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { normalizar } from "../src/lib/texto";
import type { ModeloCobro, TipoServicio } from "../src/lib/servicios";

type Db = ReturnType<typeof drizzle<typeof schema>>;

type ServicioSemilla = {
  nombre: string;
  tipo: TipoServicio;
  destino: string;
  ciudad?: string;
  modelo: ModeloCobro;
  notaCobro?: string;
  descripcion: string;
  recibe: string;
  enViaje: string;
  nota?: string;
  /** [nombre, pasajeros, maletas, detalle] */
  variantes: [string, number | null, number | null, string | null][];
  ligas?: [string, string | null][];
  variaPorReserva?: boolean;
};

const SERVICIOS: ServicioSemilla[] = [
  {
    nombre: "Traslado privado · Aeropuerto de Cancún",
    tipo: "traslado",
    destino: "Cancún y Riviera Maya",
    ciudad: "Cancún",
    modelo: "vehiculo",
    notaCobro: "La duración del trayecto se calcula al cotizar, con el origen y destino de cada cliente.",
    descripcion:
      "Traslado privado del aeropuerto a tu hotel y de regreso, sin paradas ni esperas por otros pasajeros.",
    recibe: "Datos del chofer un día antes",
    enViaje:
      "Hasta un día antes dice «Por llegar» con la fecha. Después: hora, punto de encuentro, letrero, chofer, vehículo y botón para llamar. Siempre con «Si en 15 minutos no ves a tu chofer, escríbenos».",
    nota: "Pedir nombre del chofer y placas por WhatsApp un día antes.",
    variantes: [
      ["Suburban", 6, 6, null],
      ["Van privada", 10, 10, null],
      ["Sprinter", 19, 19, null],
      ["Van adaptada", 6, 6, "rampa"],
    ],
    variaPorReserva: true,
  },
  {
    nombre: "Traslado privado · Europa",
    tipo: "traslado",
    destino: "Barcelona, Madrid, Roma y más",
    modelo: "vehiculo",
    descripcion: "Traslado privado entre el aeropuerto o la estación de tren y el hotel.",
    recibe: "Bono con teléfono del operador",
    enViaje: "El bono de TBO se sube tal cual; trae el teléfono del operador local.",
    variantes: [
      ["Sedán", 3, 3, null],
      ["Minivan", 7, 7, null],
    ],
    ligas: [["TBO Holidays", null]],
  },
  {
    nombre: "Seguro de viaje",
    tipo: "seguro",
    destino: "Nacional e internacional",
    modelo: "persona_dia",
    notaCobro: "Por persona y por días de vigencia. Mayores de 70 años cotizan aparte.",
    descripcion: "Gastos médicos, equipaje y cancelación durante todo el viaje.",
    recibe: "Póliza en PDF y asistencia 24 h",
    enViaje:
      "En el viaje: número de póliza para copiar, asistencia 24 horas para llamar y el PDF. Durante el viaje aparece arriba como acceso de emergencia.",
    variantes: [
      ["Básico", null, null, "Gastos médicos hasta USD 30,000 · médico y equipaje"],
      ["Plus", null, null, "Gastos médicos hasta USD 60,000 · médico, equipaje y cancelación"],
      ["Premium", null, null, "Gastos médicos hasta USD 150,000 · todo lo anterior y deportes"],
    ],
    ligas: [["Assist Card", null]],
  },
  {
    nombre: "eSIM de datos",
    tipo: "conectividad",
    destino: "México, Europa y Japón",
    modelo: "unidad",
    notaCobro: "Por eSIM: no todos los viajeros la necesitan.",
    descripcion: "Datos móviles desde que aterrizas, sin cambiar de chip.",
    recibe: "Código QR por persona",
    enViaje: "Cada persona recibe su QR. Antes de mandarlo se confirma que su celular acepta eSIM.",
    variantes: [
      ["México", null, null, "10 GB · 8 días"],
      ["Europa", null, null, "20 GB · 15 días"],
      ["Japón", null, null, "10 GB · 10 días"],
    ],
  },
  {
    nombre: "Renta de silla de ruedas",
    tipo: "equipo",
    destino: "Cancún y Riviera Maya",
    ciudad: "Cancún",
    modelo: "dia",
    notaCobro: "Por día de renta, de la entrega a la devolución.",
    descripcion: "Silla de ruedas entregada en el aeropuerto o en el hotel, por los días del viaje.",
    recibe: "Hora y lugar de entrega",
    enViaje: "Entrega y devolución con hora y lugar; el depósito lo paga el cliente al recibirla.",
    variantes: [
      ["Estándar", null, null, "Depósito reembolsable al recibirla"],
      ["Plegable ligera", null, null, "Depósito reembolsable al recibirla"],
      ["Eléctrica", null, null, "Depósito reembolsable al recibirla"],
    ],
    variaPorReserva: true,
  },
  {
    nombre: "Reservación de restaurante",
    tipo: "reservacion",
    destino: "Cualquier destino",
    modelo: "fijo",
    notaCobro: "Cargo por gestión fijo; el consumo lo paga el cliente en el restaurante.",
    descripcion: "Mesa reservada para una ocasión especial, con petición al restaurante.",
    recibe: "Confirmación con nombre y hora",
    enViaje: "Fecha, hora, número de personas, tolerancia y petición especial.",
    variantes: [
      ["Solo reservación", null, null, "Cargo por gestión de Airoo"],
      ["Menú prepagado", null, null, "Menú más cargo por gestión"],
    ],
    variaPorReserva: true,
  },
];

export async function sembrarServicios(db: Db, duenoId: string) {
  const ya = await db.select({ id: schema.servicios.id }).from(schema.servicios).limit(1);
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

  for (const s of SERVICIOS) {
    const [nuevo] = await db
      .insert(schema.servicios)
      .values({
        nombre: s.nombre,
        nombreBusqueda: normalizar(s.nombre),
        tipo: s.tipo,
        destino: s.destino,
        ciudadId: s.ciudad ? ciudad(s.ciudad) : null,
        modeloCobro: s.modelo,
        notaCobro: s.notaCobro ?? null,
        descripcion: s.descripcion,
        clienteRecibe: s.recibe,
        enViajeConfirmado: s.enViaje,
        notaInterna: s.nota ?? null,
        variaPorReserva: !!s.variaPorReserva,
        creadoPor: duenoId,
      })
      .returning({ id: schema.servicios.id });
    await db.insert(schema.servicioVariantes).values(
      s.variantes.map(([nombre, pasajeros, maletas, detalle], orden) => ({
        servicioId: nuevo.id,
        nombre,
        pasajeros,
        maletas,
        detalle,
        orden,
      })),
    );
    for (const [p, idExterno] of s.ligas ?? [])
      await db
        .insert(schema.servicioProveedores)
        .values({ servicioId: nuevo.id, proveedorId: proveedor(p), idExterno });
  }
}
