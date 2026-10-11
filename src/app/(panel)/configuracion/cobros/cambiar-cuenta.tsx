"use client";

import { useState, useTransition } from "react";
import { agrupar, errorNumeroCuenta, soloDigitos } from "@/lib/cuentas";
import { HORAS_PARA_ACTIVAR } from "@/lib/configuracion";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { cambiarCuentaCobro, pedirCodigo } from "../acciones";
import type { CuentaCobro } from "../datos";

type Metodo = "codigo" | "contrasena";

export function CambiarCuenta({
  abierto,
  actual,
  alCerrar,
  alCambiar,
}: {
  abierto: boolean;
  actual: CuentaCobro | null;
  alCerrar: () => void;
  alCambiar: (activaEn: string) => void;
}) {
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={actual ? "Cambiar la cuenta para recibir pagos" : "Cuenta para recibir pagos"}
      sub={
        actual
          ? `La nueva se activa ${HORAS_PARA_ACTIVAR} h después; mientras, Datos y pago sigue con la CLABE ··${actual.ultimos4}.`
          : `Se activa ${HORAS_PARA_ACTIVAR} h después de confirmarla.`
      }
      ancho={520}
    >
      <Formulario alCancelar={alCerrar} alCambiar={alCambiar} />
    </Dialogo>
  );
}

function Formulario({
  alCancelar,
  alCambiar,
}: {
  alCancelar: () => void;
  alCambiar: (activaEn: string) => void;
}) {
  const [banco, setBanco] = useState("");
  const [clabe, setClabe] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("codigo");
  const [enviado, setEnviado] = useState<string | null>(null);
  const [secreto, setSecreto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const digitos = soloDigitos(clabe);
  const errorClabe = digitos.length >= 18 ? errorNumeroCuenta("clabe", digitos) : null;
  const clabeLista = digitos.length === 18 && !errorClabe;

  const mandar = () =>
    iniciar(async () => {
      setError(null);
      const r = await pedirCodigo();
      if ("error" in r) return setError(r.error);
      setEnviado(r.correo ?? "tu correo");
    });

  const guardar = () =>
    iniciar(async () => {
      setError(null);
      const r = await cambiarCuentaCobro({ banco, clabe: digitos, metodo, secreto });
      if ("error" in r) return setError(r.error);
      alCambiar(r.activaEn ?? "");
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[160px_1fr] gap-3">
        <Campo
          etiqueta="Banco"
          id="cobro-banco"
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          autoComplete="off"
        />
        <Campo
          etiqueta="CLABE"
          id="cobro-clabe"
          value={agrupar(clabe)}
          inputMode="numeric"
          maxLength={22}
          onChange={(e) => setClabe(soloDigitos(e.target.value).slice(0, 18))}
          autoComplete="off"
          error={errorClabe ?? undefined}
          ayuda={!errorClabe ? "18 dígitos. Se revisa el dígito verificador." : undefined}
        />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl px-4 py-3.5 shadow-borde">
        <legend className="px-1 text-[13px] font-semibold">Confirmar que eres tú</legend>
        <div role="group" aria-label="Cómo confirmar" className="flex gap-1.5">
          {(
            [
              ["codigo", "Código por correo"],
              ["contrasena", "Contraseña"],
            ] as const
          ).map(([m, texto]) => (
            <button
              key={m}
              type="button"
              aria-pressed={metodo === m}
              onClick={() => {
                setMetodo(m);
                setSecreto("");
                setError(null);
              }}
              className={`h-[30px] cursor-pointer rounded-lg px-2.5 text-[12.5px] font-semibold ${
                metodo === m
                  ? "bg-azul-tenue text-azul-oscuro shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
                  : "bg-tarjeta text-tinta-2 shadow-borde hover:bg-suave"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
        {metodo === "codigo" ? (
          enviado ? (
            <Campo
              etiqueta="Código de 6 dígitos"
              id="cobro-codigo"
              value={secreto}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setSecreto(soloDigitos(e.target.value))}
              autoComplete="one-time-code"
              ayuda={`Se mandó a ${enviado}.`}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-tinta-2">El código llega al correo del dueño.</p>
              <Boton variante="secundario" onClick={mandar} disabled={pendiente}>
                Mandar código
              </Boton>
            </div>
          )
        ) : (
          <Campo
            etiqueta="Tu contraseña"
            id="cobro-contrasena"
            type="password"
            value={secreto}
            onChange={(e) => setSecreto(e.target.value)}
            autoComplete="current-password"
          />
        )}
      </fieldset>

      {error ? (
        <p role="alert" className="text-[13px] text-rojo">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" className="h-10" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton onClick={guardar} disabled={pendiente || !clabeLista || banco.trim().length < 2 || !secreto}>
          Guardar cuenta nueva
        </Boton>
      </div>
    </div>
  );
}
