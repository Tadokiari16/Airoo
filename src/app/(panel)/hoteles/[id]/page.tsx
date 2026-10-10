import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../../sin-acceso";
import { cargarHotel, historialHotel, opcionesCiudad, opcionesProveedor, otrosHoteles } from "../datos";
import { gilroy } from "@/app/fuentes/cliente";
import { FichaHotel } from "./ficha";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const h = await cargarHotel((await params).id);
  return { title: h?.nombre ?? "Hotel" };
}

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const { id } = await params;
  const hotel = await cargarHotel(id);
  if (!hotel) notFound();
  const [ciudades, proveedores, historial, otros, unidoCon] = await Promise.all([
    opcionesCiudad(),
    opcionesProveedor(),
    historialHotel(id),
    puede(yo.rol, "eliminar_catalogos") ? otrosHoteles(id) : Promise.resolve([]),
    hotel.unidoA ? cargarHotel(hotel.unidoA) : Promise.resolve(null),
  ]);
  // La ciudad del hotel sigue en la lista aunque se haya archivado.
  if (!ciudades.some((c) => c.id === hotel.ciudadId)) {
    ciudades.push({ id: hotel.ciudadId, nombre: hotel.ciudad, detalle: hotel.ciudadCompleta, busqueda: "" });
  }
  const ultimo = historial[0];
  return (
    <FichaHotel
      hotel={hotel}
      ciudades={ciudades}
      proveedores={proveedores}
      historial={historial}
      editada={
        ultimo ? `${ultimo.quien === yo.nombre ? "Tú" : ultimo.quien} · ${ultimo.cuando}` : hotel.editada
      }
      otros={otros}
      unidoCon={unidoCon ? { id: unidoCon.id, nombre: unidoCon.nombre } : null}
      fuenteCliente={gilroy.variable}
      permisos={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
      }}
    />
  );
}
