"use client";

import { useActionState } from "react";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { aceptarInvitacion } from "../acciones";

export function FormularioBienvenida() {
  const [estado, accion, enviando] = useActionState(aceptarInvitacion, undefined);
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="mt-5 flex flex-col gap-4">
      <Campo
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="new-password"
        ayuda="Al menos 10 caracteres."
        required
      />
      <Campo
        etiqueta="Escríbela otra vez"
        name="confirmacion"
        type="password"
        autoComplete="new-password"
        required
      />
      {estado?.error ? (
        <p role="alert" className="text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : "Entrar al panel"}
      </Boton>
    </form>
  );
}
