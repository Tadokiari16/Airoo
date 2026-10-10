"use client";

import { useState } from "react";
import { bolitas, nombreRegimen, textoCalificacion } from "@/lib/hoteles";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoFoto } from "@/components/iconos";
import { MarcoPortada } from "@/components/catalogo/fotos";
import type { Hotel } from "../datos";

/**
 * Así se ve el hotel en la propuesta del cliente (390 px, Gilroy). Las fechas,
 * habitaciones elegidas y huéspedes salen de cada cotización; aquí se muestra
 * solo lo que viene de la ficha guardada.
 */
export function VistaPrevia({
  hotel: h,
  abierto,
  alCerrar,
  fuenteCliente,
}: {
  hotel: Hotel;
  abierto: boolean;
  alCerrar: () => void;
  fuenteCliente: string;
}) {
  const [leerMas, setLeerMas] = useState(false);
  const fotos = (h.portada ? 1 : 0) + h.galeria.length;
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Vista previa como cliente"
      sub="Con la ficha guardada. Fechas, habitaciones y huéspedes salen de cada cotización."
      ancho={460}
    >
      <div
        className={`${fuenteCliente} mx-auto w-[390px] max-w-full rounded-[22px] bg-[#f3f5f9] px-4 py-5 font-cliente text-[#101828]`}
      >
        <h3 className="text-[22px] font-bold">Hospedaje</h3>
        <p className="mb-3 text-[14px] text-[#5b6577]">Tu hotel para este viaje.</p>
        <article className="overflow-hidden rounded-[18px] bg-white shadow-[0_0_0_1px_#e6e9ef]">
          {h.portada ? (
            <MarcoPortada foto={h.portada}>
              {fotos > 1 ? (
                <span className="absolute right-3 bottom-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-black/55 px-3 text-[13px] font-semibold text-white">
                  <IconoFoto tam={14} /> Ver fotos
                </span>
              ) : null}
            </MarcoPortada>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-[#e8ecf2] text-[13px] text-[#5b6577]">
              Sin portada todavía
            </div>
          )}
          <div className="px-4 pt-3.5 pb-4">
            {h.regimenes.length ? (
              <p className="text-[13px] font-semibold text-[#5b6577]">
                {h.regimenes.map(nombreRegimen).join(" o ")}
              </p>
            ) : null}
            <h4 className="text-[19px] leading-tight font-bold">{h.nombre}</h4>
            {h.tripadvisorCalificacion ? (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#5b6577]">
                <b className="text-[#101828]">{textoCalificacion(h.tripadvisorCalificacion)}</b>
                <span className="inline-flex gap-[2px]" aria-hidden="true">
                  {bolitas(h.tripadvisorCalificacion).map((b, i) => (
                    <span
                      key={i}
                      className={`size-[9px] rounded-full border border-[#8a93a3] ${b === "llena" ? "bg-[#8a93a3]" : b === "media" ? "bg-[linear-gradient(90deg,#8a93a3_50%,transparent_50%)]" : ""}`}
                    />
                  ))}
                </span>
                {h.tripadvisorOpiniones
                  ? `${h.tripadvisorOpiniones.toLocaleString("en-US")} opiniones`
                  : null}
              </p>
            ) : null}
            {h.llegada || h.salida ? (
              <div className="mt-3 flex justify-between border-t border-[#eceef2] pt-3 text-[13px]">
                <div>
                  <b className="block text-[14px]">Check-in</b>
                  <span className="text-[#5b6577]">{h.llegada ? `Desde las ${h.llegada}` : "—"}</span>
                </div>
                <div className="text-right">
                  <b className="block text-[14px]">Check-out</b>
                  <span className="text-[#5b6577]">{h.salida ? `Hasta las ${h.salida}` : "—"}</span>
                </div>
              </div>
            ) : null}
            {h.descripcion ? (
              <>
                <p
                  className={`mt-3 text-[14.5px] leading-snug text-[#3b4556] ${leerMas ? "" : "line-clamp-3"}`}
                >
                  {h.descripcion}
                </p>
                <button
                  type="button"
                  onClick={() => setLeerMas(!leerMas)}
                  className="mt-1 cursor-pointer text-[14px] font-semibold text-azul"
                >
                  {leerMas ? "Leer menos" : "Leer más"}
                </button>
              </>
            ) : null}
            {h.habitaciones.length ? (
              <div className="mt-3 border-t border-[#eceef2] pt-3">
                <p className="text-[13px] text-[#5b6577]">Habitaciones de este hotel</p>
                <ul className="mt-1">
                  {h.habitaciones.map((r) => (
                    <li key={r.id} className="py-1 text-[14.5px] font-semibold">
                      {r.nombre}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </Dialogo>
  );
}
