"use client";

import { useState, useTransition } from "react";
import { MAX_MALETAS, MAX_PASAJEROS } from "@/lib/traslados";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Interruptor } from "@/components/ui/interruptor";
import { crearUnidad, type DatosUnidad } from "./acciones";

const ENTRADA =
  "h-9 w-full min-w-0 rounded-[10px] bg-tarjeta px-2.5 text-[13.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)] placeholder:text-tinta-3";
const ETIQUETA = "flex flex-col gap-1 text-[12.5px] font-semibold";

const VACIA: DatosUnidad = { nombre: "", pasajeros: 4, maletas: 4, adaptada: false, descripcion: "" };

/** Nombre, capacidad, si es adaptada y, en la edición, la descripción. */
export function CamposUnidad({
  datos,
  alCambiar,
  descripcion = false,
}: {
  datos: DatosUnidad;
  alCambiar: (d: DatosUnidad) => void;
  descripcion?: boolean;
}) {
  const numero = (t: string, max: number) => Math.min(max, Number(t.replace(/\D/g, "").slice(0, 2) || 0));
  return (
    <div className="flex flex-col gap-2.5">
      <label className={ETIQUETA}>
        Nombre
        <input
          value={datos.nombre}
          onChange={(e) => alCambiar({ ...datos, nombre: e.target.value })}
          placeholder="Ej. Van"
          autoComplete="off"
          className={ENTRADA}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={ETIQUETA}>
          Pasajeros máximos
          <input
            inputMode="numeric"
            value={datos.pasajeros || ""}
            onChange={(e) => alCambiar({ ...datos, pasajeros: numero(e.target.value, MAX_PASAJEROS) })}
            className={`${ENTRADA} num`}
          />
        </label>
        <label className={ETIQUETA}>
          Maletas máximas
          <input
            inputMode="numeric"
            value={datos.maletas}
            onChange={(e) => alCambiar({ ...datos, maletas: numero(e.target.value, MAX_MALETAS) })}
            className={`${ENTRADA} num`}
          />
        </label>
      </div>
      <span className="flex items-center gap-2.5 text-[13.5px]">
        <Interruptor
          etiqueta="Adaptada para silla de ruedas"
          encendido={datos.adaptada}
          alCambiar={() => alCambiar({ ...datos, adaptada: !datos.adaptada })}
        />
        <span>
          <b className="font-semibold">Adaptada para silla de ruedas</b>
          <span className="block text-[12.5px] text-tinta-3">
            Con rampa o elevador. Solo se propone en el armador cuando el viaje lo pide.
          </span>
        </span>
      </span>
      {descripcion ? (
        <label className={ETIQUETA}>
          Descripción
          <textarea
            value={datos.descripcion ?? ""}
            onChange={(e) => alCambiar({ ...datos, descripcion: e.target.value })}
            rows={3}
            placeholder="Lo que ve el cliente en la propuesta."
            className="w-full rounded-[10px] bg-tarjeta px-2.5 py-2 text-[13.5px] font-normal shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)] placeholder:text-tinta-3"
          />
        </label>
      ) : null}
    </div>
  );
}

export function NuevaUnidad({
  abierto,
  alCerrar,
  alCrear,
}: {
  abierto: boolean;
  alCerrar: () => void;
  alCrear: (id: string, nombre: string) => void;
}) {
  const [datos, setDatos] = useState<DatosUnidad>(VACIA);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cerrar = () => {
    setDatos(VACIA);
    setError(null);
    alCerrar();
  };
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Nuevo tipo de unidad"
      sub="Nombre y capacidad; la foto y la descripción van después."
      ancho={480}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await crearUnidad(datos);
            if ("error" in r) return setError(r.error);
            const nombre = datos.nombre.trim();
            setDatos(VACIA);
            setError(null);
            alCrear(r.id, nombre);
          });
        }}
        className="flex flex-col gap-4"
      >
        <CamposUnidad datos={datos} alCambiar={setDatos} />
        <p className="text-[13px] text-tinta-2">
          Sin ciudad, proveedor ni precio: eso se elige en cada cotización.
        </p>
        {error ? (
          <p role="alert" className="text-[13px] text-rojo">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={pendiente || datos.nombre.trim().length < 2 || !datos.pasajeros}>
            Agregar
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
