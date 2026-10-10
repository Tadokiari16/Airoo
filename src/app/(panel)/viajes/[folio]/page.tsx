import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { puede } from "@/lib/permisos";
import { usuarioActual } from "@/lib/sesion";
import { SinAcceso } from "../../sin-acceso";
import { cargarViaje } from "../datos";
import { VistaViaje } from "./vista";

const folioDe = (texto: string) => {
  const n = Number(texto.replace(/^AIR-/i, ""));
  return Number.isInteger(n) && n > 0 ? n : null;
};

export async function generateMetadata({ params }: { params: Promise<{ folio: string }> }): Promise<Metadata> {
  return { title: `AIR-${(await params).folio}` };
}

export default async function Viaje({
  params,
  searchParams,
}: {
  params: Promise<{ folio: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const yo = await usuarioActual();
  if (!puede(yo.rol, "ver_viajes")) return <SinAcceso />;
  const folio = folioDe((await params).folio);
  if (!folio) notFound();
  const viaje = await cargarViaje(folio, yo);
  if (!viaje) notFound();
  const { p } = await searchParams;
  return <VistaViaje viaje={viaje} pestana={p === "historial" ? "historial" : "resumen"} />;
}
