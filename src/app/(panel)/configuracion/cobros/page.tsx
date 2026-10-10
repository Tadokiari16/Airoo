import type { Metadata } from "next";
import { cargarAjustes, cargarCuentasCobro } from "../datos";
import { Cobros } from "./cobros";

export const metadata: Metadata = { title: "Cobros a clientes" };

export default async function PaginaCobros() {
  const [a, cuentas] = await Promise.all([cargarAjustes(), cargarCuentasCobro()]);
  return (
    <Cobros
      cuentas={cuentas}
      plazo={a.plazo_datos_y_pago.horas}
      vigencia={a.vigencia_cotizacion.dias}
      flexibles={a.pagos_flexibles.dias_antes}
      recordatorios={a.recordatorios_cliente.dias_antes}
    />
  );
}
