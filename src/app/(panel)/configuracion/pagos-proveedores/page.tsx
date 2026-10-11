import type { Metadata } from "next";
import { cargarAjustes, cargarFormasPago } from "../datos";
import { PagosProveedores } from "./pagos";

export const metadata: Metadata = { title: "Pagos a proveedores" };

export default async function PaginaPagos() {
  const [a, formas] = await Promise.all([cargarAjustes(), cargarFormasPago()]);
  return <PagosProveedores formas={formas} avisoDias={a.aviso_pago_proveedor.dias_antes} />;
}
