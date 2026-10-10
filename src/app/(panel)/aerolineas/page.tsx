import type { Metadata } from "next";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../sin-acceso";
import { cargarAerolineas, listaIata, llegarAntes } from "./datos";
import { ListaAerolineas } from "./lista";

export const metadata: Metadata = { title: "Aerolíneas" };

export default async function Aerolineas({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const editar = puede(yo.rol, "editar_catalogos");
  const [aerolineas, iata, horas, { a }] = await Promise.all([
    cargarAerolineas(),
    // La lista de referencia solo hace falta para agregar.
    editar ? listaIata() : Promise.resolve([]),
    llegarAntes(),
    searchParams,
  ]);
  return (
    <ListaAerolineas
      aerolineas={aerolineas}
      iata={iata}
      llegarAntes={horas}
      inicial={a ?? null}
      permisos={{
        editar,
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
      }}
    />
  );
}
