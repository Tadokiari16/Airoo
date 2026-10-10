import type { Metadata } from "next";
import { Encabezado } from "../encabezado";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Clientes" };

export default function Clientes() {
  return (
    <>
      <Encabezado titulo="Clientes">Quién viaja con Airoo, cómo contactarle y sus viajes.</Encabezado>
      <Tarjeta>
        <Vacio titulo="Todavía no hay clientes">
          Cada cliente aparece aquí cuando se crea su primer viaje. La ficha del cliente sigue en diseño.
        </Vacio>
      </Tarjeta>
    </>
  );
}
