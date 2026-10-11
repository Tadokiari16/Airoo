import "server-only";
import { asc, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { formatoFechaCorta } from "@/lib/fechas";
import { normalizar } from "@/lib/texto";
import type { TipoCuenta } from "@/lib/cuentas";

export type Contacto = {
  id: string;
  nombre: string;
  paraQue: "reservas" | "ventas" | "pagos" | "emergencias";
  whatsapp: string | null;
  correo: string | null;
  horario: string | null;
  principal: boolean;
};

/** Cuenta donde recibe, sin el número: ese solo sale con «Ver completa». */
export type Cuenta = {
  id: string;
  tipo: TipoCuenta;
  banco: string;
  aNombreDe: string;
  ultimos4: string;
  estado: "pendiente" | "verificada";
  telefonoLlamada: string | null;
  historial: string;
  reemplazaA: string | null;
};

export type Proveedor = {
  id: string;
  nombre: string;
  tipo: "plataforma" | "directo";
  categorias: string[];
  sitio: string | null;
  numeroAgencia: string | null;
  notaInterna: string | null;
  desde: string;
  archivado: boolean;
  motivoArchivo: string | null;
  contactos: Contacto[];
  cuentas: Cuenta[];
  usos: { hoteles: number; actividades: number; servicios: number; viajes: number };
  busqueda: string;
};

export async function listaProveedores(): Promise<Proveedor[]> {
  const filas = await db.select().from(schema.proveedores).orderBy(asc(schema.proveedores.nombreBusqueda));
  if (filas.length === 0) return [];
  const ids = filas.map((p) => p.id);

  const contactos = await db
    .select()
    .from(schema.proveedorContactos)
    .where(inArray(schema.proveedorContactos.proveedorId, ids))
    .orderBy(sql`${schema.proveedorContactos.principal} desc`, asc(schema.proveedorContactos.creadoEn));

  const quienRegistro = alias(schema.usuarios, "quien_registro");
  const quienReviso = alias(schema.usuarios, "quien_reviso");
  const cuentas = await db
    .select({
      c: schema.proveedorCuentas,
      registro: quienRegistro.nombre,
      reviso: quienReviso.nombre,
    })
    .from(schema.proveedorCuentas)
    .leftJoin(quienRegistro, sql`${quienRegistro.id} = ${schema.proveedorCuentas.creadoPor}`)
    .leftJoin(quienReviso, sql`${quienReviso.id} = ${schema.proveedorCuentas.revisadaPor}`)
    .where(
      sql`${schema.proveedorCuentas.proveedorId} in ${ids} and ${schema.proveedorCuentas.estado} in ('pendiente', 'verificada')`,
    )
    .orderBy(asc(schema.proveedorCuentas.creadoEn));

  const usos = async (tabla: "hotel_proveedores" | "actividad_proveedores" | "servicio_proveedores") => {
    const r = await db.execute<{ proveedor_id: string; n: number }>(
      sql`select proveedor_id, count(*)::int as n from ${sql.identifier(tabla)} group by proveedor_id`,
    );
    return new Map(r.map((f) => [f.proveedor_id, f.n]));
  };
  const [hoteles, actividades, servicios] = await Promise.all([
    usos("hotel_proveedores"),
    usos("actividad_proveedores"),
    usos("servicio_proveedores"),
  ]);

  return filas.map((p) => {
    const suyos = contactos.filter((c) => c.proveedorId === p.id);
    return {
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      categorias: p.categorias,
      sitio: p.sitio,
      numeroAgencia: p.numeroAgencia,
      notaInterna: p.notaInterna,
      desde: p.desde,
      archivado: !!p.archivadoEn,
      motivoArchivo: p.motivoArchivo,
      contactos: suyos.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        paraQue: c.paraQue,
        whatsapp: c.whatsapp,
        correo: c.correo,
        horario: c.horario,
        principal: c.principal,
      })),
      cuentas: cuentas
        .filter((f) => f.c.proveedorId === p.id)
        .map(({ c, registro, reviso }) => ({
          id: c.id,
          tipo: c.tipo,
          banco: c.banco,
          aNombreDe: c.aNombreDe,
          ultimos4: c.ultimos4,
          estado: c.estado as "pendiente" | "verificada",
          telefonoLlamada: c.telefonoLlamada,
          reemplazaA: c.reemplazaA,
          historial:
            c.estado === "verificada"
              ? `Verificada por ${reviso ?? "el dueño"} · ${formatoFechaCorta(c.revisadaEn ?? c.creadoEn)}` +
                (c.telefonoLlamada ? ` · llamada al ${c.telefonoLlamada}` : "")
              : `Registrada por ${registro ?? "el equipo"} · ${formatoFechaCorta(c.creadoEn)}`,
        })),
      usos: {
        hoteles: hoteles.get(p.id) ?? 0,
        actividades: actividades.get(p.id) ?? 0,
        servicios: servicios.get(p.id) ?? 0,
        viajes: 0,
      },
      busqueda: normalizar([p.nombre, ...suyos.map((c) => c.nombre)].join(" ")),
    };
  });
}

export type Parecido = { id: string; nombre: string; archivado: boolean };

/** Proveedores con nombre parecido, para avisar antes de crear un duplicado. */
export async function proveedoresParecidos(nombre: string, sinId?: string): Promise<Parecido[]> {
  const n = normalizar(nombre);
  const filas = await db
    .select({
      id: schema.proveedores.id,
      nombre: schema.proveedores.nombre,
      archivadoEn: schema.proveedores.archivadoEn,
    })
    .from(schema.proveedores)
    .where(
      sql`(${schema.proveedores.nombreBusqueda} = ${n}
        or ${schema.proveedores.nombreBusqueda} like ${n + "%"}
        or ${n} like ${schema.proveedores.nombreBusqueda} || '%'
        or extensions.similarity(${schema.proveedores.nombreBusqueda}, ${n}) >= 0.45)
        and ${schema.proveedores.id}::text <> ${sinId ?? ""}`,
    )
    .orderBy(sql`extensions.similarity(${schema.proveedores.nombreBusqueda}, ${n}) desc`)
    .limit(4);
  return filas.map((f) => ({ id: f.id, nombre: f.nombre, archivado: !!f.archivadoEn }));
}
