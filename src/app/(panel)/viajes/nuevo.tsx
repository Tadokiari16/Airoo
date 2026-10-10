"use client";

import { useActionState, useEffect, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { ElegirCiudad, type OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { buscarClientes, crearViaje, type ResultadoNuevo } from "./acciones";
import type { ClienteOpcion } from "./datos";

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
  const [busqueda, setBusqueda] = useState("");
  const [encontrados, setEncontrados] = useState<ClienteOpcion[]>([]);
  const [cliente, setCliente] = useState<ClienteOpcion | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [destino, setDestino] = useState(ciudades.find((c) => c.busqueda === "cancun")?.id ?? "");
  const [salida, setSalida] = useState("");
  const [menores, setMenores] = useState(0);
  const [edades, setEdades] = useState<string[]>([]);

  useEffect(() => {
    if (cliente || nuevo) return;
    const t = setTimeout(async () => setEncontrados(await buscarClientes(busqueda)), 200);
    return () => clearTimeout(t);
  }, [busqueda, cliente, nuevo]);

  const soloDigitos = /^[\d\s+()-]+$/.test(busqueda.trim());

  return (
    <form onSubmit={enviarSinVaciar(accion)} className="flex flex-col gap-4">
      <input type="hidden" name="clienteId" value={cliente?.id ?? ""} />
      <input type="hidden" name="edades" value={edades.slice(0, menores).filter(Boolean).join(",")} />

      <div className="flex flex-col gap-1.5">
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
        <Campo etiqueta="Adultos" name="adultos" type="number" min={1} max={40} defaultValue={2} required />
        <Campo
          etiqueta="Menores"
          name="menores"
          type="number"
          min={0}
          max={20}
          value={menores}
          onChange={(e) => setMenores(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
        />
      </div>

      {menores > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Edad de cada menor</span>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: menores }, (_, i) => (
              <input
                key={i}
                aria-label={`Edad del menor ${i + 1}`}
                inputMode="numeric"
                value={edades[i] ?? ""}
                onChange={(e) => {
                  const n = [...edades];
                  n[i] = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setEdades(n);
                }}
                placeholder="Años"
                className="h-10 w-20 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
              />
            ))}
          </div>
          <p className="text-[12.5px] text-tinta-3">
            Si todavía no se saben, se puede cotizar; antes de enviar se piden.
          </p>
        </div>
      ) : null}

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
