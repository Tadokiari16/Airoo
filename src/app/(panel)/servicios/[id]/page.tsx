import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../../sin-acceso";
import { cargarServicio, historialServicio, opcionesCiudad, opcionesProveedor } from "../datos";
import { FichaServicio } from "./ficha";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = await cargarServicio((await params).id);
  return { title: s?.nombre ?? "Servicio" };
}

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const { id } = await params;
  const servicio = await cargarServicio(id);
  if (!servicio) notFound();
  const [ciudades, proveedores, historial] = await Promise.all([
    opcionesCiudad(),
    opcionesProveedor(),
    historialServicio(id),
  ]);
  // La ciudad del servicio sigue en la lista aunque se haya archivado.
  if (servicio.ciudadId && servicio.ciudad && !ciudades.some((c) => c.id === servicio.ciudadId)) {
    ciudades.push({ id: servicio.ciudadId, nombre: servicio.ciudad, detalle: "", busqueda: "" });
  }
  const ultimo = historial[0];
  return (
    <FichaServicio
      servicio={servicio}
      ciudades={ciudades}
      proveedores={proveedores}
      historial={historial}
      editado={
        ultimo ? `${ultimo.quien === yo.nombre ? "Tú" : ultimo.quien} · ${ultimo.cuando}` : servicio.editado
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
