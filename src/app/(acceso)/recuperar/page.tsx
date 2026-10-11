"use client";

import Link from "next/link";
import { useActionState } from "react";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { pedirRecuperacion } from "../acciones";

export default function Recuperar() {
  const [estado, accion, enviando] = useActionState(pedirRecuperacion, undefined);
  return (
    <>
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">Cambiar contraseña</h1>
      {estado?.listo ? (
        <p role="status" className="mt-3 text-tinta-2">
          Si el correo tiene cuenta en Airoo, le llega una liga para elegir una contraseña nueva. Vence en 24
          horas.
        </p>
      ) : (
        <>
          <p className="mt-1 text-tinta-2">
            Te mandamos por correo una liga para elegir una contraseña nueva.
          </p>
          <form onSubmit={enviarSinVaciar(accion)} className="mt-5 flex flex-col gap-4">
            <Campo
              etiqueta="Correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              error={estado?.error}
            />
            <Boton type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Mandar liga"}
            </Boton>
          </form>
        </>
      )}
      <Link
        href="/entrar"
        className="mt-4 block text-center text-[13px] font-semibold text-azul-oscuro hover:underline"
      >
        Regresar a Entrar
      </Link>
    </>
  );
}
