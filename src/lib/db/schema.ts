// Tablas de la Fase 0. El modelo completo está en
// propuestas/Propuesta-stack-modelo-fases-0-1.md; cada fase agrega las suyas.
//
// Todas las tablas tienen RLS encendido y ninguna política: nadie las lee por
// la API pública de Supabase. El panel las lee desde el servidor y los
// permisos se deciden en src/lib/permisos.ts.

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
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
