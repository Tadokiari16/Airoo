import type { Metadata } from "next";
import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Finanzas" };

export default async function Finanzas() {
  if (!(await usuarioCon("ver_finanzas"))) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Finanzas">
        Lo que entra, lo que debes y lo que ganas, por viaje y por mes.
      </Encabezado>
      <Tarjeta>
        <Vacio titulo="Todavía no hay movimientos">
          Aquí aparecen los cobros a clientes, los pagos a proveedores, la utilidad y las comisiones en cuanto
          haya viajes.
        </Vacio>
      </Tarjeta>
    </>
  );
}
