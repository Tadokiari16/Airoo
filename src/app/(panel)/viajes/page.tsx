import type { Metadata } from "next";
import { connection } from "next/server";
import { formatoFechaLarga, saludo } from "@/lib/fechas";
import { EncabezadoTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Viajes" };

export default async function Viajes() {
  await connection();
  const ahora = new Date();
  return (
    <>
      <div className="mt-[26px] mb-5">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] first-letter:text-azul">{saludo(ahora)}</h1>
        <p className="num mt-1 text-[14.5px] text-tinta-2">{formatoFechaLarga(ahora)}</p>
      </div>
      <Tarjeta>
        <EncabezadoTarjeta titulo="Viajes" />
        <div className="border-t border-linea">
          <Vacio titulo="Todavía no hay viajes">
            Cada viaje aparece aquí con sus fechas, su etapa, lo que lleva invertido y quién lo tiene a cargo.
          </Vacio>
        </div>
      </Tarjeta>
    </>
  );
}
