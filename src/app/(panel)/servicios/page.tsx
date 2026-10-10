import type { Metadata } from "next";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../sin-acceso";
import { cargarServicios } from "./datos";
import { ListaServicios } from "./lista";

export const metadata: Metadata = { title: "Servicios" };

export default async function Servicios({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const [servicios, { s }] = await Promise.all([cargarServicios(), searchParams]);
  return (
    <ListaServicios
      servicios={servicios}
      inicial={s ?? null}
      permisos={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
      }}
    />
  );
}
