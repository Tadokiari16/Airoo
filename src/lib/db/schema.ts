// Tablas de las Fases 0 y 1. El modelo completo está en
// propuestas/Propuesta-stack-modelo-fases-0-1.md (con los ajustes de
// propuestas/Fase-1-propuesta.md); cada fase agrega las suyas.
//
// Todas las tablas tienen RLS encendido y ninguna política: nadie las lee por
// la API pública de Supabase. El panel las lee desde el servidor y los
// permisos se deciden en src/lib/permisos.ts.

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

const momento = (nombre?: string) =>
  nombre ? timestamp(nombre, { withTimezone: true }) : timestamp({ withTimezone: true });

const creadoEn = () => momento().notNull().defaultNow();

export const rol = pgEnum("rol", ["dueno", "asesora", "contador"]);

export const usuarios = pgTable("usuarios", {
  id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  nombre: text().notNull(),
  iniciales: text().notNull(),
  correo: text().notNull(),
  whatsapp: text(),
  rol: rol().notNull(),
  activo: boolean().notNull().default(true),
  ultimoAcceso: momento(),
  creadoEn: creadoEn(),
  actualizadoEn: momento().notNull().defaultNow(),
}).enableRLS();

export const estadoInvitacion = pgEnum("estado_invitacion", ["pendiente", "aceptada", "cancelada"]);

export const invitaciones = pgTable(
  "invitaciones",
  {
    id: uuid().primaryKey().defaultRandom(),
    nombre: text().notNull(),
    correo: text().notNull(),
    whatsapp: text(),
    rol: rol().notNull(),
    // La cuenta que Supabase crea al generar la liga. Queda sin contraseña
    // hasta que la persona acepta.
    cuentaId: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    invitadoPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
    estado: estadoInvitacion().notNull().default("pendiente"),
    venceEn: momento().notNull(),
    aceptadaEn: momento(),
    creadoEn: creadoEn(),
  },
  (t) => [index().on(t.cuentaId)],
).enableRLS();

// Ajustes de la agencia: una fila por ajuste. Las pantallas llegan en la Fase 1.
export const configuracion = pgTable("configuracion", {
  clave: text().primaryKey(),
  valor: jsonb().notNull(),
  actualizadoPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
  actualizadoEn: momento().notNull().defaultNow(),
}).enableRLS();

// Lista compartida por hoteles, actividades, servicios y viajes.
export const ciudades = pgTable(
  "ciudades",
  {
    id: uuid().primaryKey().defaultRandom(),
    nombre: text().notNull(),
    region: text().notNull(),
    pais: text().notNull().default("México"),
    // Nombre sin acentos ni mayúsculas, para buscar y avisar de parecidas.
    nombreBusqueda: text().notNull(),
    archivadoEn: momento(),
    creadoPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
    creadoEn: creadoEn(),
    actualizadoEn: momento().notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ciudades_unica").on(t.nombreBusqueda, sql`lower(${t.region})`, sql`lower(${t.pais})`)],
).enableRLS();

export const avisos = pgTable(
  "avisos",
  {
    id: uuid().primaryKey().defaultRandom(),
    para: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    // Se liga a viajes en la Fase 2.
    viajeId: uuid(),
    tipo: text().notNull(),
    prioridad: boolean().notNull().default(false),
    texto: text().notNull(),
    liga: text(),
    leidoEn: momento(),
    hechoEn: momento(),
    pospuestoHasta: momento(),
    resueltoEn: momento(),
    creadoEn: creadoEn(),
  },
  (t) => [index().on(t.para, t.leidoEn)],
).enableRLS();

// Quién cambió qué y cuándo. Se conserva un año.
export const bitacora = pgTable(
  "bitacora",
  {
    id: uuid().primaryKey().defaultRandom(),
    cuando: momento().notNull().defaultNow(),
    quien: uuid().references(() => usuarios.id, { onDelete: "set null" }),
    texto: text().notNull(),
    entidad: text(),
    entidadId: text(),
    antes: jsonb(),
    despues: jsonb(),
  },
  (t) => [index().on(t.cuando)],
).enableRLS();

// ─── Fase 1 · Catálogos ─────────────────────────────────────────────────────
// Ningún catálogo guarda precios: los precios se capturan en el armador.
// La única excepción con monto son los cargos que el cliente paga en el hotel
// (impuesto de saneamiento, resort fee), que se le muestran aparte.

export const moneda = pgEnum("moneda", ["MXN", "USD", "EUR"]);

/** Archivar, no borrar: lo comparten todos los catálogos. */
const archivo = () => ({
  archivadoEn: momento(),
  archivadoPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
  motivoArchivo: text(),
});

const autoria = () => ({
  creadoPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
  creadoEn: creadoEn(),
  actualizadoEn: momento().notNull().defaultNow(),
});

// Proveedores guarda solo datos. Cuándo se paga, con qué, en qué moneda y qué
// cancelación aplica es el acuerdo de cada reserva (Fase 2).
export const tipoProveedor = pgEnum("tipo_proveedor", ["plataforma", "directo"]);

export const proveedores = pgTable(
  "proveedores",
  {
    id: uuid().primaryKey().defaultRandom(),
    nombre: text().notNull(),
    nombreBusqueda: text().notNull(),
    tipo: tipoProveedor().notNull(),
    // «Hoteles», «Tours y parques», «Traslados», «Seguros», «Otro».
    categorias: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Solo plataformas. Usuario y contraseña no se guardan.
    sitio: text(),
    numeroAgencia: text(),
    razonSocial: text(),
    notaInterna: text(),
    desde: date({ mode: "string" }).notNull().defaultNow(),
    ...archivo(),
    ...autoria(),
  },
  (t) => [index().on(t.nombreBusqueda)],
).enableRLS();

export const paraQueContacto = pgEnum("para_que_contacto", ["reservas", "ventas", "pagos", "emergencias"]);

export const proveedorContactos = pgTable(
  "proveedor_contactos",
  {
    id: uuid().primaryKey().defaultRandom(),
    proveedorId: uuid()
      .notNull()
      .references(() => proveedores.id, { onDelete: "cascade" }),
    nombre: text().notNull(),
    paraQue: paraQueContacto().notNull(),
    whatsapp: text(),
    correo: text(),
    horario: text(),
    principal: boolean().notNull().default(false),
    creadoEn: creadoEn(),
  },
  (t) => [index().on(t.proveedorId)],
).enableRLS();

export const tipoCuenta = pgEnum("tipo_cuenta", ["clabe", "tarjeta"]);
export const estadoCuentaProveedor = pgEnum("estado_cuenta_proveedor", [
  "pendiente",
  "verificada",
  "rechazada",
  "reemplazada",
]);

// Dónde recibe un proveedor. Una cuenta nueva o cambiada queda pendiente hasta
// confirmarla por llamada al número que ya estaba registrado.
export const proveedorCuentas = pgTable(
  "proveedor_cuentas",
  {
    id: uuid().primaryKey().defaultRandom(),
    proveedorId: uuid()
      .notNull()
      .references(() => proveedores.id, { onDelete: "cascade" }),
    tipo: tipoCuenta().notNull(),
    banco: text().notNull(),
    aNombreDe: text().notNull(),
    // Cifrado en el servidor (src/lib/cifrado.ts); en pantalla solo los últimos 4.
    numeroCifrado: text().notNull(),
    ultimos4: text().notNull(),
    estado: estadoCuentaProveedor().notNull().default("pendiente"),
    // El número al que se llamó para confirmar: el que ya estaba registrado.
    telefonoLlamada: text(),
    confirmoPorTelefono: boolean().notNull().default(false),
    estadoCuentaCoincide: boolean().notNull().default(false),
    revisadaPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
    revisadaEn: momento(),
    reemplazaA: uuid().references((): AnyPgColumn => proveedorCuentas.id, { onDelete: "set null" }),
    // El primer pago a una cuenta nueva se marca para revisión (Fase 4).
    primerPagoRevisado: boolean().notNull().default(false),
    ...autoria(),
  },
  (t) => [index().on(t.proveedorId)],
).enableRLS();

// ─── Hoteles ─────────────────────────────────────────────────────────────────

export const hoteles = pgTable(
  "hoteles",
  {
    id: uuid().primaryKey().defaultRandom(),
    nombre: text().notNull(),
    nombreBusqueda: text().notNull(),
    ciudadId: uuid()
      .notNull()
      .references(() => ciudades.id),
    descripcion: text(),
    // RO, BB, HB, FB, AI. En cada cotización se elige cuál se vende.
    regimenes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    direccion: text(),
    ligaMaps: text(),
    telefonoPublico: text(),
    // Se capturan a mano: sin API de Tripadvisor en esta versión.
    tripadvisorId: text(),
    tripadvisorCalificacion: integer(), // en décimas: 45 = 4.5
    tripadvisorOpiniones: integer(),
    tripadvisorActualizadoEn: momento(),
    llegadaDesde: time(),
    salidaHasta: time(),
    edadMenoresDe: integer(),
    edadMenoresA: integer(),
    llegadaAnticipada: text(),
    reglas: text(),
    telefonoReservaciones: text(),
    correoReservaciones: text(),
    notaInterna: text(),
    soloAdultos: boolean().notNull().default(false),
    // Marcado a mano cuando el hotel no cobra nada aparte (para no dejar la ficha pendiente).
    sinCargos: boolean().notNull().default(false),
    unidoA: uuid().references((): AnyPgColumn => hoteles.id, { onDelete: "set null" }),
    ...archivo(),
    ...autoria(),
  },
  (t) => [index().on(t.nombreBusqueda), index().on(t.ciudadId)],
).enableRLS();

// Sin camas ni personas: eso se elige en el armador.
export const hotelHabitaciones = pgTable(
  "hotel_habitaciones",
  {
    id: uuid().primaryKey().defaultRandom(),
    hotelId: uuid()
      .notNull()
      .references(() => hoteles.id, { onDelete: "cascade" }),
    nombreCliente: text().notNull(),
    orden: integer().notNull().default(0),
    creadoEn: creadoEn(),
  },
  (t) => [index().on(t.hotelId)],
).enableRLS();

// El nombre que usa cada plataforma para la misma habitación.
export const hotelHabitacionNombres = pgTable(
  "hotel_habitacion_nombres",
  {
    id: uuid().primaryKey().defaultRandom(),
    habitacionId: uuid()
      .notNull()
      .references(() => hotelHabitaciones.id, { onDelete: "cascade" }),
    proveedorId: uuid()
      .notNull()
      .references(() => proveedores.id, { onDelete: "cascade" }),
    nombre: text().notNull(),
  },
  (t) => [index().on(t.habitacionId)],
).enableRLS();

export const seCobraCargo = pgEnum("se_cobra_cargo", ["habitacion_noche", "persona_noche", "estancia"]);

export const hotelCargos = pgTable(
  "hotel_cargos",
  {
    id: uuid().primaryKey().defaultRandom(),
    hotelId: uuid()
      .notNull()
      .references(() => hoteles.id, { onDelete: "cascade" }),
    concepto: text().notNull(),
    montoCentavos: integer().notNull(),
    moneda: moneda().notNull(),
    seCobra: seCobraCargo().notNull(),
    orden: integer().notNull().default(0),
  },
  (t) => [index().on(t.hotelId)],
).enableRLS();

// Dónde se puede reservar. No obliga a reservar en ninguna.
export const hotelProveedores = pgTable(
  "hotel_proveedores",
  {
    id: uuid().primaryKey().defaultRandom(),
    hotelId: uuid()
      .notNull()
      .references(() => hoteles.id, { onDelete: "cascade" }),
    proveedorId: uuid()
      .notNull()
      .references(() => proveedores.id, { onDelete: "cascade" }),
    idExterno: text(),
  },
  (t) => [uniqueIndex().on(t.hotelId, t.proveedorId), index().on(t.proveedorId)],
).enableRLS();

// ─── Actividades ─────────────────────────────────────────────────────────────

export const tipoActividad = pgEnum("tipo_actividad", [
  "tour",
  "excursion",
  "parque",
  "day_pass",
  "experiencia",
  "espectaculo",
  "otro",
]);
export const cobroActividad = pgEnum("cobro_actividad", ["persona", "edad", "grupo", "unidad"]);
export const horarioActividad = pgEnum("horario_actividad", ["abierto", "salidas"]);
export const llegadaActividad = pgEnum("llegada_actividad", ["recogida", "punto_encuentro", "por_su_cuenta"]);
export const confirmacionActividad = pgEnum("confirmacion_actividad", [
  "bono",
  "lista_nombres",
  "pago_taquilla",
]);

export const actividades = pgTable(
  "actividades",
  {
    id: uuid().primaryKey().defaultRandom(),
    nombre: text().notNull(),
    nombreBusqueda: text().notNull(),
    ciudadId: uuid()
      .notNull()
      .references(() => ciudades.id),
    tipo: tipoActividad().notNull(),
    duracion: text(),
    descripcion: text(),
    notaInterna: text(),
    // Lo paga el cliente ahí mismo, sin proveedor.
    sePagaEnLugar: boolean().notNull().default(false),
    // Bloques encendidos: cobro, planes, boletos, horarios, llegada, incluye, requisitos, confirmacion.
    bloques: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    cobro: cobroActividad(),
    maxPersonasGrupo: integer(),
    horarioTipo: horarioActividad(),
    horarioTexto: text(),
    llegada: llegadaActividad(),
    llegadaTexto: text(),
    incluye: text(),
    noIncluye: text(),
    queLlevar: text(),
    requisitos: text(),
    confirmacion: confirmacionActividad(),
    ...archivo(),
    ...autoria(),
  },
  (t) => [index().on(t.nombreBusqueda), index().on(t.ciudadId)],
).enableRLS();

export const actividadPlanes = pgTable(
  "actividad_planes",
  {
    id: uuid().primaryKey().defaultRandom(),
    actividadId: uuid()
      .notNull()
      .references(() => actividades.id, { onDelete: "cascade" }),
    nombre: text().notNull(),
    incluye: text(),
    orden: integer().notNull().default(0),
  },
  (t) => [index().on(t.actividadId)],
).enableRLS();

export const actividadBoletos = pgTable(
  "actividad_boletos",
  {
    id: uuid().primaryKey().defaultRandom(),
    actividadId: uuid()
      .notNull()
      .references(() => actividades.id, { onDelete: "cascade" }),
    nombre: text().notNull(),
    edadDesde: integer(),
    edadHasta: integer(),
    gratis: boolean().notNull().default(false),
    orden: integer().notNull().default(0),
  },
  (t) => [index().on(t.actividadId)],
).enableRLS();

export const actividadSalidas = pgTable(
  "actividad_salidas",
  {
    id: uuid().primaryKey().defaultRandom(),
    actividadId: uuid()
      .notNull()
      .references(() => actividades.id, { onDelete: "cascade" }),
    hora: time().notNull(),
  },
  (t) => [index().on(t.actividadId)],
).enableRLS();

// Se ligan, no se copian: los datos del proveedor se consultan desde Proveedores.
export const actividadProveedores = pgTable(
  "actividad_proveedores",
  {
    id: uuid().primaryKey().defaultRandom(),
    actividadId: uuid()
      .notNull()
      .references(() => actividades.id, { onDelete: "cascade" }),
    proveedorId: uuid()
      .notNull()
      .references(() => proveedores.id, { onDelete: "cascade" }),
    idExterno: text(),
    contactoId: uuid().references(() => proveedorContactos.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex().on(t.actividadId, t.proveedorId), index().on(t.proveedorId)],
).enableRLS();

// ─── Fotos de hoteles, habitaciones y actividades ───────────────────────────
// Una sola tabla para que el mismo componente suba, ordene y encuadre.

export const fotos = pgTable(
  "fotos",
  {
    id: uuid().primaryKey().defaultRandom(),
    hotelId: uuid().references(() => hoteles.id, { onDelete: "cascade" }),
    // Con habitación: va en el grupo de fotos de esa habitación.
    habitacionId: uuid().references(() => hotelHabitaciones.id, { onDelete: "cascade" }),
    actividadId: uuid().references(() => actividades.id, { onDelete: "cascade" }),
    archivo: text().notNull(),
    ancho: integer().notNull(),
    alto: integer().notNull(),
    orden: integer().notNull().default(0),
    esPortada: boolean().notNull().default(false),
    // Recorte 16:9 de la portada, en fracciones de la foto: { x, y, ancho, alto }.
    encuadre: jsonb(),
    creadoPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
    creadoEn: creadoEn(),
  },
  (t) => [
    index().on(t.hotelId),
    index().on(t.actividadId),
    check("fotos_de_un_solo_dueno", sql`(${t.hotelId} is null) <> (${t.actividadId} is null)`),
    check("fotos_habitacion_con_hotel", sql`${t.habitacionId} is null or ${t.hotelId} is not null`),
  ],
).enableRLS();

// ─── Servicios ───────────────────────────────────────────────────────────────

export const tipoServicio = pgEnum("tipo_servicio", [
  "traslado",
  "seguro",
  "conectividad",
  "equipo",
  "reservacion",
]);
export const modeloCobro = pgEnum("modelo_cobro", [
  "vehiculo",
  "persona",
  "persona_dia",
  "unidad",
  "dia",
  "fijo",
]);

export const servicios = pgTable(
  "servicios",
  {
    id: uuid().primaryKey().defaultRandom(),
    nombre: text().notNull(),
    nombreBusqueda: text().notNull(),
    tipo: tipoServicio().notNull(),
    // Texto libre: «Cancún y Riviera Maya», «Cualquier destino».
    destino: text(),
    ciudadId: uuid().references(() => ciudades.id),
    modeloCobro: modeloCobro().notNull(),
    descripcion: text(),
    clienteRecibe: text(),
    enViajeConfirmado: text(),
    notaInterna: text(),
    ...archivo(),
    ...autoria(),
  },
  (t) => [index().on(t.nombreBusqueda)],
).enableRLS();

// Unidades, planes o tipos: «Van adaptada», «Plus».
export const servicioVariantes = pgTable(
  "servicio_variantes",
  {
    id: uuid().primaryKey().defaultRandom(),
    servicioId: uuid()
      .notNull()
      .references(() => servicios.id, { onDelete: "cascade" }),
    nombre: text().notNull(),
    pasajeros: integer(),
    maletas: integer(),
    detalle: text(),
    orden: integer().notNull().default(0),
  },
  (t) => [index().on(t.servicioId)],
).enableRLS();

export const servicioProveedores = pgTable(
  "servicio_proveedores",
  {
    id: uuid().primaryKey().defaultRandom(),
    servicioId: uuid()
      .notNull()
      .references(() => servicios.id, { onDelete: "cascade" }),
    proveedorId: uuid()
      .notNull()
      .references(() => proveedores.id, { onDelete: "cascade" }),
    idExterno: text(),
  },
  (t) => [uniqueIndex().on(t.servicioId, t.proveedorId), index().on(t.proveedorId)],
).enableRLS();

// ─── Aerolíneas ──────────────────────────────────────────────────────────────
// No son proveedores. La lista IATA completa es solo referencia; el catálogo
// tiene las que Airoo usa.

export const aerolineasIata = pgTable("aerolineas_iata", {
  iata: text().primaryKey(),
  nombre: text().notNull(),
  pais: text(),
}).enableRLS();

export const aerolineas = pgTable("aerolineas", {
  id: uuid().primaryKey().defaultRandom(),
  iata: text().notNull().unique(),
  nombre: text().notNull(),
  sitio: text(),
  comoSeCompra: text(),
  notaInterna: text(),
  ...archivo(),
  ...autoria(),
}).enableRLS();

export const aerolineaTarifas = pgTable(
  "aerolinea_tarifas",
  {
    id: uuid().primaryKey().defaultRandom(),
    aerolineaId: uuid()
      .notNull()
      .references(() => aerolineas.id, { onDelete: "cascade" }),
    nombre: text().notNull(),
    mano: text(),
    documentada: text(),
    cambios: text(),
    orden: integer().notNull().default(0),
  },
  (t) => [index().on(t.aerolineaId)],
).enableRLS();

export const rutaVuelo = pgEnum("ruta_vuelo", ["nacional", "internacional"]);
export const fuenteCheckin = pgEnum("fuente_checkin", ["verificado", "terceros", "sin_fuente"]);

export const aerolineaCheckin = pgTable(
  "aerolinea_checkin",
  {
    id: uuid().primaryKey().defaultRandom(),
    aerolineaId: uuid()
      .notNull()
      .references(() => aerolineas.id, { onDelete: "cascade" }),
    ruta: rutaVuelo().notNull(),
    abre: text(),
    cierra: text(),
    fuente: fuenteCheckin().notNull().default("sin_fuente"),
    fuenteTexto: text(),
    verificadoPor: uuid().references(() => usuarios.id, { onDelete: "set null" }),
    verificadoEn: momento(),
  },
  (t) => [uniqueIndex().on(t.aerolineaId, t.ruta)],
).enableRLS();

// ─── Cuentas de Airoo ────────────────────────────────────────────────────────

export const estadoCuentaCobro = pgEnum("estado_cuenta_cobro", ["verificada", "por_activar", "reemplazada"]);

// CLABE donde los clientes pagan. Un cambio se confirma con código por correo o
// con la contraseña del Dueño y se activa 24 h después.
export const cuentasCobroAiroo = pgTable("cuentas_cobro_airoo", {
  id: uuid().primaryKey().defaultRandom(),
  banco: text().notNull(),
  clabeCifrada: text().notNull(),
  ultimos4: text().notNull(),
  principal: boolean().notNull().default(false),
  estado: estadoCuentaCobro().notNull().default("por_activar"),
  activaDesde: momento(),
  ...autoria(),
}).enableRLS();

export const tipoFormaPago = pgEnum("tipo_forma_pago", ["tarjeta", "cuenta"]);

// Con qué paga Airoo a proveedores. Desde el sistema no se hacen pagos.
export const formasPagoAiroo = pgTable("formas_pago_airoo", {
  id: uuid().primaryKey().defaultRandom(),
  tipo: tipoFormaPago().notNull(),
  nombre: text().notNull(),
  banco: text(),
  ultimos4: text(),
  uso: text(),
  activa: boolean().notNull().default(true),
  ...autoria(),
}).enableRLS();
