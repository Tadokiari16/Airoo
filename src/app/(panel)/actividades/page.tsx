import type { Metadata } from "next";
import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Actividades" };

export default async function Actividades() {
  if (!(await usuarioCon("ver_catalogos"))) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Actividades">
        Parques, tours, day passes y experiencias, con los bloques que cada una necesita.
      </Encabezado>
      <Tarjeta>
        <Vacio titulo="Todavía no hay actividades">
          Cada actividad lleva una ficha base y los bloques que necesita: planes, boletos por edad, horarios.
        </Vacio>
      </Tarjeta>
    </>
  );
}
