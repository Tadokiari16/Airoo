import type { Metadata } from "next";
import { usuarioActual } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { SinAcceso } from "../sin-acceso";
import { listaProveedores } from "./datos";
import { ListaProveedores } from "./lista";

export const metadata: Metadata = { title: "Proveedores" };

export default async function Proveedores({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_proveedores")) return <SinAcceso />;
  const [proveedores, { p }] = await Promise.all([listaProveedores(), searchParams]);
  return (
    <ListaProveedores
      proveedores={proveedores}
      inicial={p ?? null}
      permisos={{
        editar: puede(yo.rol, "editar_catalogos"),
        archivar: puede(yo.rol, "archivar_catalogos"),
        eliminar: puede(yo.rol, "eliminar_catalogos"),
        cuentas: puede(yo.rol, "cuentas_proveedor"),
        verCompleta: puede(yo.rol, "ver_cuenta_completa"),
      }}
    />
  );
}
