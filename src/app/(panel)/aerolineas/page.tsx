import type { Metadata } from "next";
import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Aerolíneas" };

export default async function Aerolineas() {
  if (!(await usuarioCon("ver_catalogos"))) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Aerolíneas">Tarifas, equipaje y check-in de cada aerolínea.</Encabezado>
      <Tarjeta>
        <Vacio titulo="Todavía no hay aerolíneas">
          La lista de aerolíneas se carga una vez por código IATA, con sus tarifas y ventanas de check-in.
        </Vacio>
      </Tarjeta>
    </>
  );
}
