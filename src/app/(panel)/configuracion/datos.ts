import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { anotar } from "@/lib/bitacora";
import { conDefectos, cuentasCobroAhora, type Ajustes } from "@/lib/configuracion";
import { formatoFechaHora } from "@/lib/fechas";

export async function cargarAjustes(): Promise<Ajustes> {
  const filas = await db
    .select({ clave: schema.configuracion.clave, valor: schema.configuracion.valor })
    .from(schema.configuracion);
  return conDefectos(filas);
}

export type CuentaCobro = {
  id: string;
  banco: string;
  ultimos4: string;
  /** «Se activa Sáb 11 oct, 4:10 PM» o null si ya está activa. */
  activaEn: string | null;
};

/**
 * La cuenta que usa Datos y pago y la que espera sus 24 h. Si una ya cumplió
 * su plazo, se activa aquí mismo y la anterior queda reemplazada.
 */
export async function cargarCuentasCobro(): Promise<{
  vigente: CuentaCobro | null;
  pendiente: CuentaCobro | null;
}> {
  const t = schema.cuentasCobroAiroo;
  const leer = () =>
    db
      .select()
      .from(t)
      .where(inArray(t.estado, ["verificada", "por_activar"]))
      .orderBy(desc(t.creadoEn));
  let cuentas = await leer();
  const { porActivar } = cuentasCobroAhora(cuentas, new Date());
  if (porActivar.length) {
    const nueva = porActivar[0];
    await db.transaction(async (tx) => {
      const [hecha] = await tx
        .update(t)
        .set({ estado: "verificada", principal: true, actualizadoEn: sql`now()` })
        .where(sql`${t.id} = ${nueva.id} and ${t.estado} = 'por_activar'`)
        .returning({ id: t.id });
      if (!hecha) return; // otra petición ya la activó
      await tx
        .update(t)
        .set({ estado: "reemplazada", principal: false, actualizadoEn: sql`now()` })
        .where(sql`${t.id} <> ${nueva.id} and ${t.estado} in ('verificada', 'por_activar')`);
      await anotar(
        {
          quien: null,
          texto: `Cuenta para recibir pagos activa · CLABE ··${nueva.ultimos4}`,
          entidad: "cuentas_cobro_airoo",
          entidadId: nueva.id,
        },
        tx,
      );
    });
    cuentas = await leer();
  }
  const { vigente, pendiente } = cuentasCobroAhora(cuentas, new Date());
  const forma = (c: (typeof cuentas)[number] | null, porActivar: boolean): CuentaCobro | null =>
    c
      ? {
          id: c.id,
          banco: c.banco,
          ultimos4: c.ultimos4,
          activaEn: porActivar && c.activaDesde ? formatoFechaHora(c.activaDesde) : null,
        }
      : null;
  return { vigente: forma(vigente, false), pendiente: forma(pendiente, true) };
}

export type FormaPago = {
  id: string;
  tipo: "tarjeta" | "cuenta";
  nombre: string;
  banco: string | null;
  ultimos4: string | null;
  uso: string | null;
  activa: boolean;
};

export async function cargarFormasPago(): Promise<FormaPago[]> {
  const f = schema.formasPagoAiroo;
  return db
    .select({
      id: f.id,
      tipo: f.tipo,
      nombre: f.nombre,
      banco: f.banco,
      ultimos4: f.ultimos4,
      uso: f.uso,
      activa: f.activa,
    })
    .from(f)
    .orderBy(desc(f.activa), asc(f.creadoEn));
}

export async function personasEnEquipo(): Promise<number> {
  const [fila] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.activo, true));
  return fila?.n ?? 0;
}
