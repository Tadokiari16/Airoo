import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../../sin-acceso";
import { cargarActividad, historialActividad, opcionesCiudad, opcionesProveedor } from "../datos";
import { FichaActividad } from "./ficha";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = await cargarActividad((await params).id);
  return { title: a?.nombre ?? "Actividad" };
}

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const { id } = await params;
  const actividad = await cargarActividad(id);
  if (!actividad) notFound();
  const [ciudades, proveedores, historial] = await Promise.all([
    opcionesCiudad(),
    opcionesProveedor(),
    historialActividad(id),
  ]);
  // La ciudad de la actividad sigue en la lista aunque se haya archivado.
  if (!ciudades.some((c) => c.id === actividad.ciudadId)) {
    ciudades.push({
      id: actividad.ciudadId,
      nombre: actividad.ciudad,
      detalle: actividad.ciudadCompleta,
      busqueda: "",
    });
  }
  const ultimo = historial[0];
  return (
    <FichaActividad
      actividad={actividad}
      ciudades={ciudades}
      proveedores={proveedores}
      historial={historial}
      editada={
        ultimo ? `${ultimo.quien === yo.nombre ? "Tú" : ultimo.quien} · ${ultimo.cuando}` : actividad.editada
      }
      permisos={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
      }}
      permisosProveedor={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
        cuentas: puede(yo.rol, "cuentas_proveedor"),
        verCompleta: puede(yo.rol, "ver_cuenta_completa"),
      }}
    />
  );
}
