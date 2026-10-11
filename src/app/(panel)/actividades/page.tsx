import type { Metadata } from "next";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../sin-acceso";
import { cargarActividades, opcionesCiudad } from "./datos";
import { ListaActividades } from "./lista";

export const metadata: Metadata = { title: "Actividades" };

export default async function Actividades({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const [actividades, ciudades, { a }] = await Promise.all([
    cargarActividades(),
    opcionesCiudad(),
    searchParams,
  ]);
  return (
    <ListaActividades
      actividades={actividades}
      ciudades={ciudades}
      inicial={a ?? null}
      agregaCiudades={puede(yo.rol, "configuracion")}
      permisos={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
      }}
    />
  );
}
