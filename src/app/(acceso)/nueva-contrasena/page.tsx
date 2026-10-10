"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { guardarContrasena } from "../acciones";

export default function NuevaContrasena() {
  const [estado, accion, enviando] = useActionState(guardarContrasena, undefined);
  return (
    <>
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">Contraseña nueva</h1>
      <p className="mt-1 text-tinta-2">Al guardarla entras al panel con ella.</p>
      <form action={accion} className="mt-5 flex flex-col gap-4">
        <Campo
          etiqueta="Contraseña nueva"
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
          {enviando ? "Guardando…" : "Guardar y entrar"}
        </Boton>
      </form>
    </>
  );
}
