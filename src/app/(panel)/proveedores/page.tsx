import type { Metadata } from "next";
import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Proveedores" };

export default async function Proveedores() {
  if (!(await usuarioCon("ver_proveedores"))) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Proveedores">
        Con quién reservas, a quién llamar y dónde recibe cada uno. Lo que se acuerda en cada reserva, y lo
        pendiente de pago, vive en el viaje y en Finanzas.
      </Encabezado>
      <Tarjeta>
        <Vacio titulo="Todavía no hay proveedores">
          Plataformas y proveedores directos, con sus contactos y las cuentas donde reciben.
        </Vacio>
      </Tarjeta>
    </>
  );
}
