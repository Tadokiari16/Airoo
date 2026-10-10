import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { historialDe } from "@/lib/bitacora";
import type { Encuadre } from "@/lib/fotos";
import { urlFoto } from "@/lib/imagenes";
import {
  queSePide,
  revisarActividad,
  textoEdad,
  type Bloque,
  type Cobro,
  type Confirmacion,
  type Horario,
  type Llegada,
  type RevisionActividad,
  type TipoActividad,
} from "@/lib/actividades";
import { horaCliente } from "@/lib/hoteles";
import { formatoFechaCorta, formatoMesAnio } from "@/lib/fechas";
import { normalizar } from "@/lib/texto";
import type { Foto } from "../hoteles/datos";

export { opcionesCiudad, opcionesProveedor, type OpcionCiudad, type OpcionProveedor } from "../hoteles/datos";

export type Plan = { id: string; nombre: string; incluye: string | null };
export type Boleto = {
  id: string;
  nombre: string;
  edadDesde: number | null;
  edadHasta: number | null;
  gratis: boolean;
  edad: string;
};

/** Un proveedor ligado. Sus datos se leen de Proveedores, no se copian. */
export type Ligado = {
  id: string;
  proveedorId: string;
  proveedor: string;
  tipo: "plataforma" | "directo";
  idExterno: string | null;
  contacto: { nombre: string; paraQue: string; whatsapp: string | null; correo: string | null } | null;
};

export type Actividad = {
  id: string;
  nombre: string;
  ciudadId: string;
  ciudad: string;
  ciudadCompleta: string;
  tipo: TipoActividad;
  duracion: string | null;
  descripcion: string | null;
  notaInterna: string | null;
  sePagaEnLugar: boolean;
  bloques: Bloque[];
  cobro: Cobro | null;
  maxPersonasGrupo: number | null;
  horarioTipo: Horario | null;
  horarioTexto: string | null;
  salidas: { hora: string; texto: string }[];
  llegada: Llegada | null;
  llegadaTexto: string | null;
  incluye: string | null;
  noIncluye: string | null;
  queLlevar: string | null;
  requisitos: string | null;
  confirmacion: Confirmacion | null;
  planes: Plan[];
  boletos: Boleto[];
  ligados: Ligado[];
  portada: Foto | null;
  galeria: Foto[];
  revision: RevisionActividad[];
  pide: string[];
  minima: boolean;
  archivado: boolean;
  motivoArchivo: string | null;
  // Los viajes llegan en la Fase 2 (partidas de las cotizaciones).
  viajes: number;
  desde: string;
  editada: string;
  busqueda: string;
};

const PARA_QUE: Record<string, string> = {
  reservas: "Reservas",
  ventas: "Ventas",
  pagos: "Pagos",
  emergencias: "Emergencias",
};

/** Actividades con todo lo de su ficha. Son pocas; la lista y la ficha usan lo mismo. */
export async function cargarActividades(soloId?: string): Promise<Actividad[]> {
  const a = schema.actividades;
  const filas = await db
    .select({
      a,
      ciudad: schema.ciudades.nombre,
      region: schema.ciudades.region,
      pais: schema.ciudades.pais,
      editor: schema.usuarios.nombre,
    })
    .from(a)
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, a.ciudadId))
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, a.creadoPor))
    .where(soloId ? eq(a.id, soloId) : undefined)
    .orderBy(asc(a.nombreBusqueda));
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.a.id);

  const [fotos, planes, boletos, salidas, ligas, contactos] = await Promise.all([
    db
      .select()
      .from(schema.fotos)
      .where(inArray(schema.fotos.actividadId, ids))
      .orderBy(asc(schema.fotos.orden), asc(schema.fotos.creadoEn)),
    db
      .select()
      .from(schema.actividadPlanes)
      .where(inArray(schema.actividadPlanes.actividadId, ids))
      .orderBy(asc(schema.actividadPlanes.orden)),
    db
      .select()
      .from(schema.actividadBoletos)
      .where(inArray(schema.actividadBoletos.actividadId, ids))
      .orderBy(asc(schema.actividadBoletos.orden)),
    db
      .select()
      .from(schema.actividadSalidas)
      .where(inArray(schema.actividadSalidas.actividadId, ids))
      .orderBy(asc(schema.actividadSalidas.hora)),
    db
      .select({
        l: schema.actividadProveedores,
        nombre: schema.proveedores.nombre,
        tipo: schema.proveedores.tipo,
      })
      .from(schema.actividadProveedores)
      .innerJoin(schema.proveedores, eq(schema.proveedores.id, schema.actividadProveedores.proveedorId))
      .where(inArray(schema.actividadProveedores.actividadId, ids))
      .orderBy(sql`${schema.proveedores.tipo} = 'directo'`, asc(schema.proveedores.nombre)),
    db
      .select({
        c: schema.proveedorContactos,
      })
      .from(schema.proveedorContactos)
      .innerJoin(
        schema.actividadProveedores,
        eq(schema.actividadProveedores.proveedorId, schema.proveedorContactos.proveedorId),
      )
      .where(inArray(schema.actividadProveedores.actividadId, ids))
      .orderBy(
        sql`${schema.proveedorContactos.principal} desc`,
        sql`${schema.proveedorContactos.paraQue} = 'reservas' desc`,
        asc(schema.proveedorContactos.creadoEn),
      ),
  ]);

  const aFoto = (f: (typeof fotos)[number]): Foto => ({
    id: f.id,
    url: urlFoto(f.archivo, "g"),
    miniatura: urlFoto(f.archivo, "c"),
    ancho: f.ancho,
    alto: f.alto,
    encuadre: (f.encuadre as Encuadre | null) ?? null,
  });

  return filas.map(({ a: x, ciudad, region, pais, editor }) => {
    const suyas = fotos.filter((f) => f.actividadId === x.id);
    const portada = suyas.find((f) => f.esPortada);
    const galeria = suyas.filter((f) => !f.esPortada).map(aFoto);
    const susPlanes = planes
      .filter((p) => p.actividadId === x.id)
      .map((p) => ({ id: p.id, nombre: p.nombre, incluye: p.incluye }));
    const susBoletos = boletos
      .filter((b) => b.actividadId === x.id)
      .map((b) => ({
        id: b.id,
        nombre: b.nombre,
        edadDesde: b.edadDesde,
        edadHasta: b.edadHasta,
        gratis: b.gratis,
        edad: textoEdad(b),
      }));
    const susSalidas = salidas
      .filter((s) => s.actividadId === x.id)
      .map((s) => ({ hora: s.hora.slice(0, 5), texto: horaCliente(s.hora) }));
    const ligados: Ligado[] = x.sePagaEnLugar
      ? []
      : ligas
          .filter((l) => l.l.actividadId === x.id)
          .map((l) => {
            const c =
              contactos.find((c) => c.c.id === l.l.contactoId)?.c ??
              contactos.find((c) => c.c.proveedorId === l.l.proveedorId)?.c;
            return {
              id: l.l.id,
              proveedorId: l.l.proveedorId,
              proveedor: l.nombre,
              tipo: l.tipo,
              idExterno: l.l.idExterno,
              contacto: c
                ? { nombre: c.nombre, paraQue: PARA_QUE[c.paraQue], whatsapp: c.whatsapp, correo: c.correo }
                : null,
            };
          });
    const bloques = x.bloques as Bloque[];
    const resumen = {
      bloques,
      cobro: x.cobro,
      horarioTipo: x.horarioTipo,
      llegada: x.llegada,
      sePagaEnLugar: x.sePagaEnLugar,
    };
    return {
      id: x.id,
      nombre: x.nombre,
      ciudadId: x.ciudadId,
      ciudad: `${ciudad}, ${pais}`,
      ciudadCompleta: `${ciudad}, ${region}, ${pais}`,
      tipo: x.tipo,
      duracion: x.duracion,
      descripcion: x.descripcion,
      notaInterna: x.notaInterna,
      sePagaEnLugar: x.sePagaEnLugar,
      bloques,
      cobro: x.cobro,
      maxPersonasGrupo: x.maxPersonasGrupo,
      horarioTipo: x.horarioTipo,
      horarioTexto: x.horarioTexto,
      salidas: susSalidas,
      llegada: x.llegada,
      llegadaTexto: x.llegadaTexto,
      incluye: x.incluye,
      noIncluye: x.noIncluye,
      queLlevar: x.queLlevar,
      requisitos: x.requisitos,
      confirmacion: x.confirmacion,
      planes: susPlanes,
      boletos: susBoletos,
      ligados,
      portada: portada ? aFoto(portada) : null,
      galeria,
      revision: revisarActividad({
        ...resumen,
        portada: portada ? { ancho: portada.ancho, alto: portada.alto } : null,
        fotosGaleria: galeria.length,
        descripcion: x.descripcion,
        duracion: x.duracion,
        proveedores: ligados.length,
        planes: susPlanes.length,
        boletos: susBoletos.length,
        salidas: susSalidas.length,
        maxPersonasGrupo: x.maxPersonasGrupo,
      }),
      pide: queSePide(resumen),
      minima: !portada && galeria.length === 0 && !x.descripcion,
      archivado: !!x.archivadoEn,
      motivoArchivo: x.motivoArchivo,
      viajes: 0,
      desde: formatoMesAnio(x.creadoEn),
      editada: `${editor ?? "El equipo"} · ${formatoFechaCorta(x.actualizadoEn)}`,
      busqueda: normalizar(
        [x.nombre, ciudad, region, ...ligados.map((l) => `${l.idExterno ?? ""} ${l.proveedor}`)].join(" "),
      ),
    };
  });
}

export async function cargarActividad(id: string): Promise<Actividad | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [a] = await cargarActividades(id);
  return a ?? null;
}

export const historialActividad = (id: string) => historialDe("actividades", id);

export type ActividadParecida = { id: string; nombre: string; ciudad: string; archivado: boolean };

/** Actividades con nombre parecido, para avisar antes de crear un duplicado. */
export async function actividadesParecidas(nombre: string): Promise<ActividadParecida[]> {
  const n = normalizar(nombre);
  const a = schema.actividades;
  const filas = await db
    .select({ id: a.id, nombre: a.nombre, ciudad: schema.ciudades.nombre, archivadoEn: a.archivadoEn })
    .from(a)
    .innerJoin(schema.ciudades, eq(schema.ciudades.id, a.ciudadId))
    .where(
      and(
        sql`(${a.nombreBusqueda} = ${n}
          or ${a.nombreBusqueda} like ${n + "%"}
          or ${n} like ${a.nombreBusqueda} || '%'
          or extensions.similarity(${a.nombreBusqueda}, ${n}) >= 0.45)`,
      ),
    )
    .orderBy(sql`extensions.similarity(${a.nombreBusqueda}, ${n}) desc`)
    .limit(4);
  return filas.map((f) => ({ id: f.id, nombre: f.nombre, ciudad: f.ciudad, archivado: !!f.archivadoEn }));
}
