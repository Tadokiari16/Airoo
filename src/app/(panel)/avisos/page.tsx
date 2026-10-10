import type { Metadata } from "next";
import { Encabezado } from "../encabezado";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Avisos" };

// Textos de los estados vacíos del prototipo de Avisos.
export default function Avisos() {
  return (
    <>
      <Encabezado titulo="Avisos">Lo que pasó en tus viajes y lo que necesita respuesta.</Encabezado>
      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta>
          <Vacio titulo="Nada pendiente">
            Cuando un cliente pague, escriba o se acerque un plazo, aparece aquí.
          </Vacio>
        </Tarjeta>
        <Tarjeta>
          <Vacio titulo="Sin novedades">
            Aquí llega lo informativo: aperturas del enlace, recordatorios enviados.
          </Vacio>
        </Tarjeta>
        <Tarjeta>
          <Vacio titulo="Todavía nada">
            Lo que marques como hecho o se resuelva solo queda aquí 30 días.
          </Vacio>
        </Tarjeta>
      </div>
    </>
  );
}
