import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { EncabezadoTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { ListaCiudades } from "./lista";

export const metadata: Metadata = { title: "Ciudades" };

export default async function Ciudades() {
  const filas = await db
    .select()
    .from(schema.ciudades)
    .orderBy(asc(schema.ciudades.pais), asc(schema.ciudades.nombreBusqueda));
  const ciudades = filas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    region: c.region,
    pais: c.pais,
    busqueda: c.nombreBusqueda,
    archivada: !!c.archivadoEn,
  }));
  return (
    <Tarjeta>
      <EncabezadoTarjeta
        titulo="Ciudades"
        sub="La lista la comparten todos los hoteles, actividades, servicios y viajes. Solo el dueño agrega ciudades."
      />
      <ListaCiudades ciudades={ciudades} />
    </Tarjeta>
  );
}
