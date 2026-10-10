"use client";

import { useActionState, useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoMas } from "@/components/iconos";
import { cambiarActivo, cambiarRol, cancelarInvitacion, invitar } from "./acciones";

export function BotonInvitar() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        <IconoMas tam={14} /> Invitar
      </Boton>
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo="Invitar al equipo">
        <FormularioInvitar alTerminar={() => setAbierto(false)} />
      </Dialogo>
    </>
  );
}

function FormularioInvitar({ alTerminar }: { alTerminar: () => void }) {
  const [estado, accion, enviando] = useActionState(invitar, undefined);
  const [copiada, setCopiada] = useState(false);

  if (estado && "liga" in estado) {
    const mensaje = `Hola ${estado.nombre}, te invito al panel de Airoo como ${estado.rol}. Con esta liga eliges tu contraseña (vence en 24 horas): ${estado.liga}`;
    return (
      <div className="flex flex-col gap-4">
        <p className="text-tinta-2">
          La invitación está lista. La liga sirve una sola vez, vence en 24 horas y {estado.nombre} entra con
          el rol {estado.rol}.
        </p>
        <div className="break-all rounded-campo bg-suave px-3 py-2.5 font-mono text-[12px] text-tinta-2">
          {estado.liga}
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton
            variante="secundario"
            onClick={async () => {
              await navigator.clipboard.writeText(estado.liga);
              setCopiada(true);
            }}
          >
            {copiada ? "Liga copiada" : "Copiar liga"}
          </Boton>
          {estado.whatsapp ? (
            <a
              className="inline-flex h-[34px] items-center rounded-[10px] px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
              href={`https://wa.me/${estado.whatsapp.replace("+", "")}?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir WhatsApp
            </a>
          ) : null}
          <a
            className="inline-flex h-[34px] items-center rounded-[10px] px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
            href={`mailto:${estado.correo}?subject=${encodeURIComponent("Tu invitación al panel de Airoo")}&body=${encodeURIComponent(mensaje)}`}
          >
            Abrir correo
          </a>
        </div>
        <Boton onClick={alTerminar}>Listo</Boton>
      </div>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <p className="text-tinta-2">La invitación llega por correo o WhatsApp y entra con el rol elegido.</p>
      <Campo etiqueta="Nombre" name="nombre" placeholder="Ej. Asesora 3" required />
      <Campo
        etiqueta="Correo"
        name="correo"
        type="email"
        placeholder="nombre@correo.com"
        required
        ayuda="Con este correo entra al panel."
      />
      <Campo
        etiqueta="WhatsApp · opcional"
        name="whatsapp"
        type="tel"
        placeholder="Ej. 998 123 4567"
        ayuda="Para mandarle la liga por WhatsApp."
      />
      <Selector etiqueta="Rol" name="rol" defaultValue="asesora">
        <option value="asesora">Asesora</option>
        <option value="contador">Contador</option>
      </Selector>
      {estado && "error" in estado ? (
        <p role="alert" className="text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Creando…" : "Crear invitación"}
      </Boton>
    </form>
  );
}

export function AccionesPersona({
  id,
  nombre,
  rol,
  activo,
}: {
  id: string;
  nombre: string;
  rol: "asesora" | "contador";
  activo: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const [confirmar, setConfirmar] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {activo ? (
        <div role="radiogroup" aria-label={`Rol de ${nombre}`} className="flex rounded-[10px] bg-fondo p-0.5">
          {(["asesora", "contador"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={rol === r}
              disabled={pendiente}
              onClick={() => rol !== r && iniciar(() => cambiarRol(id, r))}
              className={`h-7 rounded-lg px-2.5 text-[12.5px] font-semibold ${rol === r ? "bg-tarjeta text-tinta shadow-[0_1px_2px_rgba(17,26,43,.1)]" : "text-tinta-2"}`}
            >
              {r === "asesora" ? "Asesora" : "Contador"}
            </button>
          ))}
        </div>
      ) : null}
      <Boton
        variante="secundario"
        disabled={pendiente}
        onClick={() => (activo ? setConfirmar(true) : iniciar(() => cambiarActivo(id, true)))}
      >
        {activo ? "Quitar acceso" : "Devolver acceso"}
      </Boton>
      <Dialogo
        abierto={confirmar}
        alCerrar={() => setConfirmar(false)}
        titulo={`¿Quitar el acceso de ${nombre}?`}
      >
        <ul className="list-disc space-y-1 pl-5 text-tinta-2">
          <li>Deja de poder entrar al panel desde ahora.</li>
          <li>Sus viajes y lo que registró se quedan como están.</li>
          <li>Se puede devolver el acceso en cualquier momento.</li>
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setConfirmar(false)}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            onClick={() => {
              setConfirmar(false);
              iniciar(() => cambiarActivo(id, false));
            }}
          >
            Quitar acceso
          </Boton>
        </div>
      </Dialogo>
    </div>
  );
}

export function CancelarInvitacion({ id, nombre }: { id: string; nombre: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Boton
      variante="secundario"
      disabled={pendiente}
      aria-label={`Cancelar la invitación de ${nombre}`}
      onClick={() => iniciar(() => cancelarInvitacion(id))}
    >
      Cancelar invitación
    </Boton>
  );
}
