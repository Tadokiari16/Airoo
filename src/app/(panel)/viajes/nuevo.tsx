"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { ElegirCiudad, type OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { crearViaje, type ResultadoNuevo } from "./acciones";
import { ElegirCliente } from "./elegir-cliente";
import { Pasajeros } from "./pasajeros";

// Sin diseño en los prototipos (Fase-2-propuesta.md › 5.1): una ventana con el
// estilo del panel. La ficha del cliente sigue pendiente de diseño.

export function NuevoViaje({
  abierto,
  alCerrar,
  ciudades,
  equipo,
  eligeACargo,
  agregaCiudades,
  yo,
}: {
  abierto: boolean;
  alCerrar: () => void;
  ciudades: OpcionCiudad[];
  equipo: { id: string; nombre: string }[];
  eligeACargo: boolean;
  agregaCiudades: boolean;
  yo: string;
}) {
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo viaje"
      sub="Con cliente, destino, fechas y quiénes viajan ya se puede armar la cotización. Lo demás se completa después."
      ancho={600}
    >
      <Formulario
        alCerrar={alCerrar}
        ciudades={ciudades}
        equipo={equipo}
        eligeACargo={eligeACargo}
        agregaCiudades={agregaCiudades}
        yo={yo}
      />
    </Dialogo>
  );
}

function Formulario({
  alCerrar,
  ciudades,
  equipo,
  eligeACargo,
  agregaCiudades,
  yo,
}: {
  alCerrar: () => void;
  ciudades: OpcionCiudad[];
  equipo: { id: string; nombre: string }[];
  eligeACargo: boolean;
  agregaCiudades: boolean;
  yo: string;
}) {
  const [estado, accion, pendiente] = useActionState<ResultadoNuevo, FormData>(crearViaje, undefined);
  const [destino, setDestino] = useState(ciudades.find((c) => c.busqueda === "cancun")?.id ?? "");
  const [salida, setSalida] = useState("");

  return (
    <form onSubmit={enviarSinVaciar(accion)} className="flex flex-col gap-4">
      <ElegirCliente />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <ElegirCiudad
            ciudades={ciudades}
            agregaCiudades={agregaCiudades}
            valor={destino}
            alCambiar={setDestino}
            etiqueta="Destino"
            nombre="ciudadDestinoId"
          />
        </div>
        <div>
          <ElegirCiudad
            ciudades={ciudades}
            agregaCiudades={false}
            valor={salida}
            alCambiar={setSalida}
            etiqueta="Sale de (opcional)"
            nombre="ciudadSalidaId"
          />
        </div>
        <Campo etiqueta="Salida" name="inicio" type="date" required />
        <Campo etiqueta="Regreso" name="fin" type="date" required />
      </div>

      <Pasajeros />

      {eligeACargo ? (
        <Selector etiqueta="Lo atiende" name="aCargo" defaultValue={yo}>
          {equipo.map((u) => (
            <option key={u.id} value={u.id}>
              {u.id === yo ? `${u.nombre} (tú)` : u.nombre}
            </option>
          ))}
        </Selector>
      ) : (
        <input type="hidden" name="aCargo" value="" />
      )}

      {estado && "error" in estado ? (
        <p role="alert" className="text-[13px] font-semibold text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar} className="h-10">
          Cancelar
        </Boton>
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Creando…" : "Crear viaje"}
        </Boton>
      </div>
    </form>
  );
}
