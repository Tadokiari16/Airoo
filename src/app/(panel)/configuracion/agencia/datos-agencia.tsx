"use client";

import type { Ajustes } from "@/lib/configuracion";
import { CampoAjuste, Fila, Seccion, useGuardarAjuste } from "../controles";

type Agencia = Ajustes["agencia"];

export function DatosAgencia({ agencia }: { agencia: Agencia }) {
  const guardar = useGuardarAjuste();
  const campo = (
    clave: keyof Agencia,
    titulo: string,
    sub: string | undefined,
    extra: { placeholder?: string; modo?: "text" | "tel" } = {},
  ) => (
    <Fila titulo={titulo} sub={sub} id={`agencia-${clave}`}>
      <CampoAjuste
        id={`agencia-${clave}`}
        valor={agencia[clave]}
        texto={(v) => v}
        leer={(t) => t.trim()}
        alinear="izquierda"
        modo={extra.modo ?? "text"}
        placeholder={extra.placeholder}
        alGuardar={(v) => guardar("agencia", { ...agencia, [clave]: v })}
      />
    </Fila>
  );

  return (
    <Seccion
      titulo="Datos de la agencia"
      sub="Aparecen en el enlace del cliente, los recibos y los mensajes."
    >
      {campo("nombre_comercial", "Nombre comercial", undefined)}
      {campo("whatsapp", "WhatsApp de atención", "Desde aquí salen los mensajes a clientes", {
        modo: "tel",
        placeholder: "+52 998 000 0000",
      })}
      {campo("horario", "Horario de atención", "El cliente lee «te respondemos en horario de atención»")}
      {campo("durante_viaje", "Durante el viaje", "Emergencias fuera de horario", {
        placeholder: "Por definir",
      })}
    </Seccion>
  );
}
