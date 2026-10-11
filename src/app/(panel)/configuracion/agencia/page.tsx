import type { Metadata } from "next";
import { cargarAjustes } from "../datos";
import { contarViajesEjemplo } from "../acciones";
import { DatosAgencia } from "./datos-agencia";
import { LlegarAntes } from "./llegar-antes";
import { ViajesEjemplo } from "./viajes-ejemplo";

export const metadata: Metadata = { title: "Datos y horario" };

export default async function PaginaAgencia() {
  const [a, ejemplos] = await Promise.all([cargarAjustes(), contarViajesEjemplo()]);
  return (
    <div className="flex flex-col gap-4">
      <DatosAgencia agencia={a.agencia} />
      <LlegarAntes valor={a.llegar_aeropuerto} />
      <ViajesEjemplo cuantos={ejemplos} />
    </div>
  );
}
