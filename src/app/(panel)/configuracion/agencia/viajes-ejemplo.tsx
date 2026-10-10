"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { borrarViajesEjemplo } from "../acciones";
import { Fila, Seccion, useAvisar } from "../controles";

export function ViajesEjemplo({ cuantos }: { cuantos: number }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, empezar] = useTransition();
  const avisar = useAvisar();
  if (cuantos === 0) return null;
  return (
    <Seccion
      titulo="Viajes de ejemplo"
      sub="El viaje de Nataly Cervantes y dos más sirven para conocer el sistema. Se pueden borrar cuando el equipo empiece con viajes reales."
    >
      <Fila titulo={`${cuantos} ${cuantos === 1 ? "viaje de ejemplo" : "viajes de ejemplo"}`} sub="Los catálogos no cambian">
        <Boton variante="secundario" onClick={() => setAbierto(true)}>
          Borrar viajes de ejemplo
        </Boton>
      </Fila>
      <Dialogo
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="Borrar viajes de ejemplo"
        sub="Se borran los viajes de ejemplo y sus clientes, con sus cotizaciones. No vuelven a aparecer. Hoteles, actividades y proveedores se quedan como están."
      >
        {error ? <p className="mb-2 text-[13px] font-semibold text-rojo">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={() => setAbierto(false)}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            disabled={enCurso}
            onClick={() =>
              empezar(async () => {
                const r = await borrarViajesEjemplo();
                if ("error" in r) setError(r.error);
                else {
                  setAbierto(false);
                  avisar("Se borraron los viajes de ejemplo");
                }
              })
            }
          >
            Borrar
          </Boton>
        </div>
      </Dialogo>
    </Seccion>
  );
}
