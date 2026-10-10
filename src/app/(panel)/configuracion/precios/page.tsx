import type { Metadata } from "next";
import { cargarAjustes } from "../datos";
import { tipoCambioVigente } from "@/lib/tipo-cambio";
import { formatoDia } from "@/lib/fechas";
import { Precios } from "./precios";

export const metadata: Metadata = { title: "Precios" };

export default async function PaginaPrecios() {
  const [a, usd, eur] = await Promise.all([cargarAjustes(), tipoCambioVigente("USD"), tipoCambioVigente("EUR")]);
  const fx = (x: typeof usd) => (x ? { ...x, dia: formatoDia(x.fecha) } : null);
  return (
    <Precios
      ganancia={a.ganancia_defecto}
      cargo={a.cargo_servicio.centavos}
      tolerancia={a.tolerancia_precio.centavos}
      colchon={a.colchon_tipo_cambio.porcentaje}
      usd={fx(usd)}
      eur={fx(eur)}
      conBanxico={!!process.env.BANXICO_TOKEN}
    />
  );
}
