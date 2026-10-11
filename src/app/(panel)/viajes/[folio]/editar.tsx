"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { ElegirCiudad } from "@/components/catalogo/elegir-ciudad";
import { rangoCorto } from "@/lib/fechas";
import { editarViaje } from "../acciones";
import { ElegirCliente } from "../elegir-cliente";
import { Pasajeros } from "../pasajeros";
import type { ViajeCompleto } from "../datos";

/**
 * Cliente, destino, fechas y pasajeros del viaje. Los servicios no se mueven al cambiar
 * las fechas: los que quedan fuera se avisan aquí, se marcan en la ficha y el armador los
 * muestra como error al revisar.
 */
export function EditarViaje({
  v,
  abierto,
  alCerrar,
  alAvisar,
}: {
  v: ViajeCompleto;
  abierto: boolean;
  alCerrar: () => void;
  alAvisar: (t: string) => void;
}) {
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Editar viaje"
      sub={`${v.folioTexto} · los servicios no cambian solos; si las fechas dejan alguno fuera, se marca.`}
      ancho={600}
    >
      {abierto ? <Formulario v={v} alCerrar={alCerrar} alAvisar={alAvisar} /> : null}
    </Dialogo>
  );
}

function Formulario({ v, alCerrar, alAvisar }: { v: ViajeCompleto; alCerrar: () => void; alAvisar: (t: string) => void }) {
  const [destino, setDestino] = useState(v.destinoId);
  const [salida, setSalida] = useState(v.salidaId ?? "");
  const [inicio, setInicio] = useState(v.inicio);
  const [fin, setFin] = useState(v.fin);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  // Con las fechas que se están escribiendo, qué servicios quedarían fuera.
  const servicios = v.secciones.flatMap((s) => s.items);
  const fuera =
    inicio && fin && fin >= inicio ? servicios.filter((s) => s.fechas.some((f) => f < inicio || f > fin)) : [];
  const nombres = [...new Set(fuera.map((s) => s.nombre))];

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        iniciar(async () => {
          const r = await editarViaje(v.id, datos);
          if ("error" in r) return setError(r.error);
          setError(null);
          alCerrar();
          const base = r.cambios.length ? "Viaje actualizado" : "Sin cambios en el viaje";
          alAvisar(
            r.fuera.length
              ? `${base} · ${r.fuera.length === 1 ? "1 servicio queda fuera" : `${r.fuera.length} servicios quedan fuera`} de las fechas nuevas y se marcó`
              : base,
          );
        });
      }}
    >
      <ElegirCliente inicial={{ id: v.clienteId, nombre: v.cliente, whatsapp: v.whatsapp, viajes: v.clienteViajes }} />

      <div className="grid grid-cols-2 gap-3">
        <ElegirCiudad
          ciudades={v.ciudades}
          agregaCiudades={v.agregaCiudades}
          valor={destino}
          alCambiar={setDestino}
          etiqueta="Destino"
          nombre="ciudadDestinoId"
        />
        <ElegirCiudad
          ciudades={v.ciudades}
          agregaCiudades={false}
          valor={salida}
          alCambiar={setSalida}
          etiqueta="Sale de (opcional)"
          nombre="ciudadSalidaId"
        />
        <Campo etiqueta="Salida" name="inicio" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <Campo etiqueta="Regreso" name="fin" type="date" required value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>

      {nombres.length ? (
        <div role="status" className="rounded-[12px] bg-ambar-tenue px-3 py-2.5 text-[13px]">
          <p className="font-semibold text-ambar">
            {nombres.length === 1 ? "1 servicio queda fuera" : `${nombres.length} servicios quedan fuera`} de las fechas nuevas (
            {rangoCorto(inicio, fin)})
          </p>
          <p className="mt-0.5 text-tinta-2">
            {nombres.join(", ")}. No se mueven: quedan marcados en la ficha y el armador los muestra como error hasta que se
            ajusten.
          </p>
        </div>
      ) : null}

      <Pasajeros adultos={v.adultos} menores={v.menores} edades={v.edadesMenores} />

      {error ? (
        <p role="alert" className="text-[13px] font-semibold text-rojo">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar} className="h-10">
          Cancelar
        </Boton>
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </Boton>
      </div>
    </form>
  );
}
