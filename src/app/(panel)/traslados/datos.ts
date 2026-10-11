import "server-only";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { viajesPorRegistro } from "@/lib/catalogos";
import { urlFoto } from "@/lib/imagenes";
import { revisarUnidad, type RevisionUnidad } from "@/lib/traslados";
import { formatoMesAnio } from "@/lib/fechas";
import { normalizar } from "@/lib/texto";

export type Unidad = {
  id: string;
  nombre: string;
  pasajeros: number;
  maletas: number;
  adaptada: boolean;
  descripcion: string | null;
  foto: { url: string; miniatura: string } | null;
  revision: RevisionUnidad[];
  archivado: boolean;
  motivoArchivo: string | null;
  viajes: number;
  desde: string;
  busqueda: string;
};

/** Tipos de unidad del catálogo, de la más chica a la más grande. Son pocos. */
export async function cargarUnidades(): Promise<Unidad[]> {
  const t = schema.trasladoUnidades;
  const [filas, usos] = await Promise.all([
    db.select().from(t).orderBy(asc(t.pasajeros), asc(t.maletas), asc(t.nombre)),
    viajesPorRegistro("trasladoUnidadId"),
  ]);
  return filas.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    pasajeros: u.pasajeros,
    maletas: u.maletas,
    adaptada: u.adaptada,
    descripcion: u.descripcion,
    foto: u.foto ? { url: urlFoto(u.foto), miniatura: urlFoto(u.foto, "c") } : null,
    revision: revisarUnidad(u),
    archivado: !!u.archivadoEn,
    motivoArchivo: u.motivoArchivo,
    viajes: usos.get(u.id) ?? 0,
    desde: formatoMesAnio(u.creadoEn),
    busqueda: normalizar(`${u.nombre} ${u.descripcion ?? ""} ${u.adaptada ? "adaptada silla de ruedas" : ""}`),
  }));
}
