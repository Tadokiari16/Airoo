"use client";

import Link from "next/link";
import { useActionState } from "react";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { entrar } from "../acciones";

export function FormularioEntrar() {
  const [estado, accion, enviando] = useActionState(entrar, undefined);
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="mt-5 flex flex-col gap-4">
      <Campo etiqueta="Correo" name="correo" type="email" autoComplete="email" required />
      <Campo
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="current-password"
        required
      />
      {estado?.error ? (
        <p role="alert" className="text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>
      <Link
        href="/recuperar"
        className="text-center text-[13px] font-semibold text-azul-oscuro hover:underline"
      >
        Olvidé mi contraseña
      </Link>
    </form>
  );
}
