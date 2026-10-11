"use client";

import { DondeReservar as Bloque } from "../../proveedores/donde-reservar";
import type { Permisos as PermisosProveedor } from "../../proveedores/textos";
import type { Actividad, OpcionProveedor } from "../datos";
import { guardarIdLiga, ligarProveedor, pagaEnLugar, quitarLiga } from "../acciones";

/** Proveedores ligados, o «Lo paga el cliente en el lugar». */
export function DondeReservar({
  actividad: a,
  proveedores,
  editable,
  permisosProveedor,
  alAvisar,
}: {
  actividad: Actividad;
  proveedores: OpcionProveedor[];
  editable: boolean;
  permisosProveedor: PermisosProveedor;
  alAvisar: (t: string) => void;
}) {
  return (
    <Bloque
      objeto="esta actividad"
      ligados={a.ligados}
      proveedores={proveedores}
      editable={editable}
      permisosProveedor={permisosProveedor}
      alAvisar={alAvisar}
      ligar={(p) => ligarProveedor(a.id, p)}
      quitar={quitarLiga}
      guardarId={guardarIdLiga}
      sinProveedor={{
        activo: a.sePagaEnLugar,
        cambiar: (si) => pagaEnLugar(a.id, si),
        encender: "Lo paga el cliente en el lugar",
        apagar: "Se reserva con un proveedor",
        texto: "Lo paga el cliente en el lugar: no se liga a ningún proveedor y no genera pagos de Airoo.",
        vacio:
          "Sin proveedor ligado. Se puede ligar uno de Proveedores o crearlo aquí mismo; mientras tanto se cotiza igual.",
        avisoEncender: "Lo paga el cliente en el lugar · no genera pagos de Airoo",
        avisoApagar: "Se reserva con un proveedor",
        confirmar: {
          titulo: "¿Lo paga el cliente en el lugar?",
          sub: "Va en el itinerario como recomendación; no se reserva con nadie.",
          nota: "No genera pagos de Airoo. Los proveedores siguen en Proveedores.",
        },
      }}
    />
  );
}
