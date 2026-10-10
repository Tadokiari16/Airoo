import type { Metadata } from "next";
import { connection } from "next/server";
import { formatoFechaLarga, saludo } from "@/lib/fechas";
import { puede } from "@/lib/permisos";
import { usuarioActual } from "@/lib/sesion";
import { SinAcceso } from "../sin-acceso";
import { cargarViajes, opcionesNuevoViaje } from "./datos";
import { ListaViajes } from "./lista";

export const metadata: Metadata = { title: "Viajes" };

export default async function Viajes({ searchParams }: { searchParams: Promise<{ v?: string; nuevo?: string }> }) {
  await connection();
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_viajes")) return <SinAcceso />;
  const [viajes, opciones, { v, nuevo }] = await Promise.all([cargarViajes(yo), opcionesNuevoViaje(), searchParams]);
  const ahora = new Date();
  return (
    <ListaViajes
      viajes={viajes}
      saludo={saludo(ahora)}
      fecha={formatoFechaLarga(ahora)}
      inicial={v ?? null}
      abrirNuevo={nuevo === "1"}
      creaViajes={puede(yo.rol, "cotizar")}
      eligeACargo={puede(yo.rol, "editar_todos_los_viajes")}
      agregaCiudades={puede(yo.rol, "configuracion")}
      yo={yo.id}
      {...opciones}
    />
  );
}
