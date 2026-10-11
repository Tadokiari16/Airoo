"use client";

import type { Ajustes } from "@/lib/configuracion";
import { CampoAjuste, Fila, Seccion, leerNumero, useGuardarAjuste } from "../controles";

type LlegarAntes = Ajustes["llegar_aeropuerto"];

/** Cuánto antes del vuelo hay que estar en el aeropuerto. Lo usan los traslados y el viaje del cliente. */
export function LlegarAntes({ valor }: { valor: LlegarAntes }) {
  const guardar = useGuardarAjuste();
  const campo = (clave: keyof LlegarAntes, titulo: string, sub: string) => (
    <Fila titulo={titulo} sub={sub} id={`llegar-${clave}`}>
      <CampoAjuste
        id={`llegar-${clave}`}
        valor={valor[clave]}
        texto={(v) => String(v)}
        leer={leerNumero}
        sufijo="h antes"
        alGuardar={(v) => guardar("llegar_aeropuerto", { ...valor, [clave]: v })}
      />
    </Fila>
  );
  return (
    <Seccion
      titulo="Llegar al aeropuerto"
      sub="Regla general del sistema, no de cada aerolínea. Sirve para la hora de recolección del traslado de regreso y aparece en el viaje del cliente."
    >
      {campo("nacional_horas", "Vuelos nacionales", "Origen y destino en el mismo país")}
      {campo("internacional_horas", "Vuelos internacionales", "Origen y destino en distinto país")}
    </Seccion>
  );
}
