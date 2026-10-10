import type { Metadata } from "next";
import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Servicios" };

export default async function Servicios() {
  if (!(await usuarioCon("ver_catalogos"))) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Servicios">
        Traslados, seguros y extras. Cada tipo define cómo se cobra y qué recibe el cliente.
      </Encabezado>
      <Tarjeta>
        <Vacio titulo="Todavía no hay servicios">
          Traslados, seguros, eSIM y otros extras, cada uno con su forma de cobro.
        </Vacio>
      </Tarjeta>
    </>
  );
}
