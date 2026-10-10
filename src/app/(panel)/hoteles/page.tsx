import type { Metadata } from "next";
import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Hoteles" };

export default async function Hoteles() {
  if (!(await usuarioCon("ver_catalogos"))) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Hoteles">
        Fotos, habitaciones y datos que se reutilizan en cada cotización.
      </Encabezado>
      <Tarjeta>
        <Vacio titulo="Todavía no hay hoteles">
          Los hoteles se dan de alta con su nombre y su ciudad, y la ficha se completa después.
        </Vacio>
      </Tarjeta>
    </>
  );
}
