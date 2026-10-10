import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { viajesPorRegistro } from "@/lib/catalogos";
import { historialDe } from "@/lib/bitacora";
import { RUTAS, type AerolineaIata, type Fuente, type Ruta, type Tarifa } from "@/lib/aerolineas";
import { formatoFechaCorta, formatoMesAnio } from "@/lib/fechas";
import { normalizar } from "@/lib/texto";

export type VentanaCheckin = {
  ruta: Ruta;
  abre: string | null;
  cierra: string | null;
  fuente: Fuente;
  fuenteTexto: string | null;
  /** «Luis · 10 oct 2026» cuando está verificada. */
  verificada: string | null;
};

export type Aerolinea = {
  id: string;
  iata: string;
  nombre: string;
  sitio: string | null;
  comoSeCompra: string | null;
  notaInterna: string | null;
  tarifas: (Tarifa & { id: string })[];
  checkin: VentanaCheckin[];
  archivado: boolean;
  motivoArchivo: string | null;
  // Los viajes llegan en la Fase 2 (vuelos de las cotizaciones).
  viajes: number;
  desde: string;
  busqueda: string;
};

/** Aerolíneas del catálogo con tarifas y check-in. Son pocas; la lista y el panel usan lo mismo. */
export async function cargarAerolineas(): Promise<Aerolinea[]> {
  const a = schema.aerolineas;
  const filas = await db.select().from(a).orderBy(asc(a.nombre));
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.id);
  const usadoEnViajes = await viajesPorRegistro("aerolineaId");
  const [tarifas, ventanas] = await Promise.all([
    db
      .select()
      .from(schema.aerolineaTarifas)
      .where(inArray(schema.aerolineaTarifas.aerolineaId, ids))
      .orderBy(asc(schema.aerolineaTarifas.orden)),
    db
      .select({ v: schema.aerolineaCheckin, quien: schema.usuarios.nombre })
      .from(schema.aerolineaCheckin)
      .leftJoin(schema.usuarios, eq(schema.usuarios.id, schema.aerolineaCheckin.verificadoPor))
      .where(inArray(schema.aerolineaCheckin.aerolineaId, ids)),
  ]);

  return filas.map((x) => {
    const susTarifas = tarifas
      .filter((t) => t.aerolineaId === x.id)
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        mano: t.mano,
        documentada: t.documentada,
        cambios: t.cambios,
      }));
    // Siempre las dos rutas, aunque falte alguna fila.
    const checkin = RUTAS.map(({ valor }): VentanaCheckin => {
      const f = ventanas.find((v) => v.v.aerolineaId === x.id && v.v.ruta === valor);
      return {
        ruta: valor,
        abre: f?.v.abre ?? null,
        cierra: f?.v.cierra ?? null,
        fuente: f?.v.fuente ?? "sin_fuente",
        fuenteTexto: f?.v.fuenteTexto ?? null,
        verificada:
          f?.v.fuente === "verificado" && f.v.verificadoEn
            ? `${f.quien ?? "El equipo"} · ${formatoFechaCorta(f.v.verificadoEn)}`
            : null,
      };
    });
    return {
      id: x.id,
      iata: x.iata,
      nombre: x.nombre,
      sitio: x.sitio,
      comoSeCompra: x.comoSeCompra,
      notaInterna: x.notaInterna,
      tarifas: susTarifas,
      checkin,
      archivado: !!x.archivadoEn,
      motivoArchivo: x.motivoArchivo,
      viajes: usadoEnViajes.get(x.id) ?? 0,
      desde: formatoMesAnio(x.creadoEn),
      busqueda: normalizar(`${x.iata} ${x.nombre} ${susTarifas.map((t) => t.nombre).join(" ")}`),
    };
  });
}

/** La lista IATA de referencia (unas mil), para buscar al agregar. */
export async function listaIata(): Promise<AerolineaIata[]> {
  return db
    .select({
      iata: schema.aerolineasIata.iata,
      nombre: schema.aerolineasIata.nombre,
      pais: schema.aerolineasIata.pais,
    })
    .from(schema.aerolineasIata)
    .orderBy(asc(schema.aerolineasIata.nombre));
}

/** Horas para llegar al aeropuerto: regla general del sistema, no de la aerolínea. */
export async function llegarAntes(): Promise<{ nacional: number; internacional: number }> {
  const [f] = await db
    .select({ valor: schema.configuracion.valor })
    .from(schema.configuracion)
    .where(eq(schema.configuracion.clave, "llegar_aeropuerto"))
    .limit(1);
  const v = (f?.valor ?? {}) as { nacional_horas?: number; internacional_horas?: number };
  return { nacional: v.nacional_horas ?? 2, internacional: v.internacional_horas ?? 3 };
}

export const historialAerolinea = (id: string) => historialDe("aerolineas", id);
