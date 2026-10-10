import type { Metadata } from "next";
import { cargarAjustes } from "../datos";
import { DatosAgencia } from "./datos-agencia";

export const metadata: Metadata = { title: "Datos y horario" };

export default async function PaginaAgencia() {
  const a = await cargarAjustes();
  return <DatosAgencia agencia={a.agencia} />;
}
