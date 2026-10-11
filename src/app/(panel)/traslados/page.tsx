import type { Metadata } from "next";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../sin-acceso";
import { cargarUnidades } from "./datos";
import { ListaTraslados } from "./lista";

export const metadata: Metadata = { title: "Traslados" };

export default async function Traslados({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_catalogos")) return <SinAcceso />;
  const [unidades, { u }] = await Promise.all([cargarUnidades(), searchParams]);
  return (
    <ListaTraslados
      unidades={unidades}
      inicial={u ?? null}
      permisos={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
      }}
    />
  );
}
