import type { Metadata } from "next";
import { cargarAjustes } from "../datos";
import { Precios } from "./precios";

export const metadata: Metadata = { title: "Precios" };

export default async function PaginaPrecios() {
  const a = await cargarAjustes();
  return (
    <Precios
      ganancia={a.ganancia_defecto}
      cargo={a.cargo_servicio.centavos}
      tolerancia={a.tolerancia_precio.centavos}
      colchon={a.colchon_tipo_cambio.porcentaje}
    />
  );
}
