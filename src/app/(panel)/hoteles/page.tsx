import type { Metadata } from "next";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../sin-acceso";
import { cargarAjustes } from "../configuracion/datos";
import { cargarHoteles, opcionesCiudad } from "./datos";
import { ListaHoteles } from "./lista";

export const metadata: Metadata = { title: "Hoteles" };

export default async function Hoteles({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const [hoteles, ciudades, ajustes, { h }] = await Promise.all([
    cargarHoteles(),
    opcionesCiudad(),
    cargarAjustes(),
    searchParams,
  ]);
  return (
    <ListaHoteles
      hoteles={hoteles}
      ciudades={ciudades}
      inicial={h ?? null}
      agregaCiudades={puede(yo.rol, "configuracion")}
      importar={ajustes.importacion_hoteles.encendida}
      permisos={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
      }}
    />
  );
}
