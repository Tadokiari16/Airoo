import "server-only";
import { asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { FixCotizacion, Opcion, PartidaArmador } from "@/lib/armador";
import { fichasDe, fichasTraslados, type FichaArmador } from "@/lib/catalogo-armador";
import type { FichaTrasladoArmador } from "@/lib/armador-fichas";
import { llegarAntes } from "@/app/(panel)/aerolineas/datos";
import { aPuntosBase, vigencia } from "@/lib/cotizacion";
import { folioTexto, textoPersonas } from "@/lib/etapas";
import { hoyEnCancun, rangoCorto } from "@/lib/fechas";
import { puede, puedeEditarViaje } from "@/lib/permisos";
import type { Usuario } from "@/lib/sesion";
import { tipoCambioVigente } from "@/lib/tipo-cambio";
import { cotizacionesActuales, opcionesDe, partidasDe } from "@/lib/viajes";
import { cargarAjustes } from "@/app/(panel)/configuracion/datos";
import { opcionesCiudad, type OpcionCiudad } from "@/app/(panel)/hoteles/datos";
import type { ClaveSeccion } from "@/lib/armador-textos";
import type { Aeropuerto } from "@/lib/vuelos";

export type ProveedorOpcion = { id: string; nombre: string; tipo: "plataforma" | "directo"; categorias: string[] };

export type DatosArmador = {
  viaje: {
    id: string;
    folio: number;
    folioTexto: string;
    cliente: string;
    clienteNombre: string;
    destino: string;
    ciudadId: string;
    inicio: string;
    fin: string;
    adultos: number;
    menores: number;
    edadesMenores: number[];
    resumen: string;
  };
  cotizacion: {
    id: string;
    version: number;
    estado: "borrador" | "enviada" | "aceptada" | "reemplazada";
    validaHasta: string | null;
    utilidadBasePb: number;
    conIva: boolean;
    ivaPb: number;
    cargoServicio: number;
    fixFecha: string | null;
    notas: Partial<Record<ClaveSeccion, string>>;
  };
  fx: FixCotizacion;
  /** El FIX de hoy, para mostrarlo antes de que la cotización lo fije. */
  fixHoy: { usd: number | null; eur: number | null; fecha: string | null };
  partidas: PartidaArmador[];
  opciones: Opcion[];
  fichas: Record<string, FichaArmador>;
  /** Tipos de unidad de traslado: los activos para elegir y los archivados que ya se usan. */
  unidades: FichaTrasladoArmador[];
  proveedores: ProveedorOpcion[];
  /** Aeropuertos de los vuelos de esta cotización; los demás llegan al buscarlos. */
  aeropuertos: Record<string, Aeropuerto>;
  /** Claves IATA de las aerolíneas del catálogo, para validar números de vuelo. */
  aerolineas: string[];
  /** Para el alta mínima desde «Agregar servicio». */
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
  editaCatalogo: boolean;
  reglas: {
    utilidadVuelosPb: number;
    vigenciaDias: number;
    diasAntesViaje: number;
    hoy: string;
    /** Horas para llegar al aeropuerto antes del vuelo (Configuración › Datos y horario). */
    llegarAntes: { nacional: number; internacional: number };
  };
};

export async function cargarArmador(folio: number, yo: Usuario): Promise<DatosArmador | "sin_permiso" | null> {
  const [f] = await db
    .select({ v: schema.viajes, cliente: schema.clientes.nombre, destino: schema.ciudades.nombre })
    .from(schema.viajes)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.viajes.clienteId))
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, schema.viajes.ciudadDestinoId))
    .where(eq(schema.viajes.folio, folio))
    .limit(1);
  if (!f) return null;
  if (!puedeEditarViaje(yo.rol, yo.id, f.v.aCargo)) return "sin_permiso";
  const c = (await cotizacionesActuales([f.v.id])).get(f.v.id)!;
  const [partidas, opciones, ajustes, proveedores, usd, eur, ciudades] = await Promise.all([
    partidasDe([c.id]).then((m) => m.get(c.id) ?? []),
    opcionesDe([c.id]).then((m) => m.get(c.id) ?? []),
    cargarAjustes(),
    db
      .select({
        id: schema.proveedores.id,
        nombre: schema.proveedores.nombre,
        tipo: schema.proveedores.tipo,
        categorias: schema.proveedores.categorias,
      })
      .from(schema.proveedores)
      .where(isNull(schema.proveedores.archivadoEn))
      .orderBy(asc(schema.proveedores.nombre)),
    tipoCambioVigente("USD"),
    tipoCambioVigente("EUR"),
    opcionesCiudad(),
  ]);
  const claves = [...new Set(partidas.flatMap((p) => p.tramos.flatMap((t) => [t.origen, t.destino])).filter(Boolean))];
  const [fichas, aeropuertos, aerolineas, unidades, horas] = await Promise.all([
    fichasDe(partidas),
    claves.length
      ? db
          .select({
            iata: schema.aeropuertos.iata,
            nombre: schema.aeropuertos.nombre,
            ciudad: schema.aeropuertos.ciudad,
            pais: schema.aeropuertos.pais,
            paisCodigo: schema.aeropuertos.paisCodigo,
            zonaHoraria: schema.aeropuertos.zonaHoraria,
          })
          .from(schema.aeropuertos)
          .where(inArray(schema.aeropuertos.iata, claves))
      : Promise.resolve([] as Aeropuerto[]),
    db.select({ iata: schema.aerolineas.iata }).from(schema.aerolineas),
    fichasTraslados(),
    llegarAntes(),
  ]);
  const usadas = new Set(partidas.map((p) => p.trasladoUnidadId));
  const hoy = hoyEnCancun();
  return {
    viaje: {
      id: f.v.id,
      folio: f.v.folio,
      folioTexto: folioTexto(f.v.folio),
      cliente: f.cliente,
      clienteNombre: f.cliente.split(/\s+/)[0],
      destino: f.destino,
      ciudadId: f.v.ciudadDestinoId,
      inicio: f.v.inicio,
      fin: f.v.fin,
      adultos: f.v.adultos,
      menores: f.v.menores,
      edadesMenores: f.v.edadesMenores,
      resumen: `${f.destino} · ${rangoCorto(f.v.inicio, f.v.fin)} · ${textoPersonas(f.v.adultos + f.v.menores)}`,
    },
    cotizacion: {
      id: c.id,
      version: c.version,
      estado: c.estado,
      validaHasta: c.validaHasta ?? vigencia(hoy, ajustes.vigencia_cotizacion.dias, []).propuesta,
      utilidadBasePb: c.utilidadBasePb,
      conIva: c.conIva,
      ivaPb: c.ivaPb,
      cargoServicio: c.cargoServicioCentavos,
      fixFecha: c.fixFecha,
      notas: c.notas ?? {},
    },
    fx: { fixUsd: c.fixUsd, fixEur: c.fixEur, colchonPb: c.colchonPb },
    fixHoy: { usd: usd?.diezmilesimos ?? null, eur: eur?.diezmilesimos ?? null, fecha: usd?.fecha ?? eur?.fecha ?? null },
    partidas,
    opciones,
    fichas,
    unidades: (unidades as FichaTrasladoArmador[]).filter((u) => !u.archivada || usadas.has(u.id)),
    proveedores,
    aeropuertos: Object.fromEntries(aeropuertos.map((a) => [a.iata, a])),
    aerolineas: aerolineas.map((a) => a.iata),
    ciudades,
    agregaCiudades: puede(yo.rol, "configuracion"),
    editaCatalogo: puede(yo.rol, "editar_catalogos"),
    reglas: {
      utilidadVuelosPb: aPuntosBase(ajustes.ganancia_defecto.vuelos),
      vigenciaDias: ajustes.vigencia_cotizacion.dias,
      diasAntesViaje: ajustes.pagos_flexibles.dias_antes,
      hoy,
      llegarAntes: horas,
    },
  };
}

/** El último acuerdo con un proveedor: el armador lo propone como punto de partida. */
export async function ultimoAcuerdo(proveedorId: string) {
  const [p] = await db
    .select({
      pagoProveedor: schema.partidas.pagoProveedor,
      anticipoProveedorPb: schema.partidas.anticipoProveedorPb,
      cancelacionTexto: schema.partidas.cancelacionTexto,
    })
    .from(schema.partidas)
    .where(eq(schema.partidas.proveedorId, proveedorId))
    .orderBy(desc(schema.partidas.actualizadoEn))
    .limit(1);
  return p ?? null;
}
