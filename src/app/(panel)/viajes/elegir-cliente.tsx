"use client";

import { useEffect, useState } from "react";
import { Campo } from "@/components/ui/campo";
import { buscarClientes } from "./acciones";
import type { ClienteOpcion } from "./datos";

/**
 * Busca un cliente que ya existe o toma los datos de uno nuevo. Escribe tres campos
 * del formulario: `clienteId`, `clienteNombre` y `clienteWhatsapp`.
 */
export function ElegirCliente({ inicial = null }: { inicial?: ClienteOpcion | null }) {
  const [busqueda, setBusqueda] = useState("");
  const [encontrados, setEncontrados] = useState<ClienteOpcion[]>([]);
  const [cliente, setCliente] = useState<ClienteOpcion | null>(inicial);
  const [nuevo, setNuevo] = useState(false);

  useEffect(() => {
    if (cliente || nuevo) return;
    const t = setTimeout(async () => setEncontrados(await buscarClientes(busqueda)), 200);
    return () => clearTimeout(t);
  }, [busqueda, cliente, nuevo]);

  const soloDigitos = /^[\d\s+()-]+$/.test(busqueda.trim());

  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name="clienteId" value={cliente?.id ?? ""} />
      <span className="text-[13px] font-semibold">Cliente</span>
      {cliente ? (
        <div className="flex h-10 items-center gap-2 rounded-campo bg-azul-tenue px-3 text-sm shadow-[inset_0_0_0_1.5px_var(--color-azul)]">
          <b className="font-semibold">{cliente.nombre}</b>
          <span className="text-tinta-2">
            {cliente.whatsapp ?? "Sin WhatsApp"} · {cliente.viajes} {cliente.viajes === 1 ? "viaje" : "viajes"}
          </span>
          <button
            type="button"
            onClick={() => setCliente(null)}
            className="ml-auto cursor-pointer text-[13px] font-semibold text-azul-oscuro hover:underline"
          >
            Cambiar
          </button>
        </div>
      ) : nuevo ? (
        <div className="grid grid-cols-2 gap-3 rounded-campo bg-suave p-3">
          <Campo
            etiqueta="Nombre"
            name="clienteNombre"
            defaultValue={soloDigitos ? "" : busqueda}
            placeholder="Nombre y apellido"
            autoFocus
          />
          <Campo
            etiqueta="WhatsApp"
            name="clienteWhatsapp"
            defaultValue={soloDigitos ? busqueda : ""}
            placeholder="998 214 7730"
            inputMode="tel"
          />
          <button
            type="button"
            onClick={() => setNuevo(false)}
            className="col-span-2 cursor-pointer justify-self-start text-[13px] font-semibold text-azul-oscuro hover:underline"
          >
            Buscar un cliente que ya existe
          </button>
        </div>
      ) : (
        <>
          <input
            aria-label="Buscar cliente"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o WhatsApp"
            autoComplete="off"
            className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
          />
          <ul className="overflow-hidden rounded-campo shadow-borde empty:hidden">
            {encontrados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCliente(c)}
                  className="flex w-full cursor-pointer items-baseline gap-2 border-t border-linea px-3 py-2 text-left text-sm first:border-t-0 hover:bg-suave"
                >
                  <b className="font-semibold">{c.nombre}</b>
                  <span className="text-[12.5px] text-tinta-3">
                    {c.whatsapp ?? "Sin WhatsApp"} · {c.viajes} {c.viajes === 1 ? "viaje" : "viajes"}
                  </span>
                </button>
              </li>
            ))}
            {busqueda.trim().length >= 2 ? (
              <li>
                <button
                  type="button"
                  onClick={() => setNuevo(true)}
                  className="flex w-full cursor-pointer items-baseline gap-2 border-t border-linea px-3 py-2 text-left text-sm first:border-t-0 hover:bg-suave"
                >
                  <b className="font-semibold text-azul-oscuro">Cliente nuevo: «{busqueda.trim()}»</b>
                  <span className="text-[12.5px] text-tinta-3">Con nombre y WhatsApp basta</span>
                </button>
              </li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}
