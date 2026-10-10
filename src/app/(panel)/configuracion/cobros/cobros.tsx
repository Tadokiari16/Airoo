"use client";

import { useState, useTransition } from "react";
import { PLAZOS_DATOS_Y_PAGO, RECORDATORIOS } from "@/lib/configuracion";
import { Boton } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/insignia";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoFinanzas } from "@/components/iconos";
import { cancelarCambioCuenta } from "../acciones";
import {
  CampoAjuste,
  Ejemplo,
  Fijo,
  Fila,
  ListaAjuste,
  Seccion,
  Segmentos,
  leerEntero,
  useAvisar,
  useGuardarAjuste,
} from "../controles";
import type { CuentaCobro } from "../datos";
import { CambiarCuenta } from "./cambiar-cuenta";

export function Cobros({
  cuentas,
  plazo,
  vigencia,
  flexibles,
  recordatorios,
}: {
  cuentas: { vigente: CuentaCobro | null; pendiente: CuentaCobro | null };
  plazo: number;
  vigencia: number;
  flexibles: number;
  recordatorios: number[];
}) {
  const guardar = useGuardarAjuste();
  const avisar = useAvisar();
  const [cambiar, setCambiar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const { vigente, pendiente: nueva } = cuentas;

  return (
    <div className="flex flex-col gap-4">
      <Seccion
        titulo="Cuentas para recibir pagos"
        sub="La que aparece en Datos y pago. Cada viaje usa su folio como referencia."
      >
        {vigente ? (
          <Cuenta
            titulo={`Cuenta de Airoo · CLABE ··${vigente.ultimos4}`}
            sub={`${vigente.banco} · verificada · se confirma cada pago con su CEP`}
            insignia={<Insignia tono="verde">Principal</Insignia>}
            accion={
              nueva ? null : (
                <Boton variante="secundario" onClick={() => setCambiar(true)}>
                  Cambiar
                </Boton>
              )
            }
          />
        ) : (
          <Cuenta
            titulo="Sin cuenta para recibir pagos"
            sub="Datos y pago necesita una CLABE para mostrarle al cliente dónde pagar."
            accion={<Boton onClick={() => setCambiar(true)}>Agregar cuenta</Boton>}
          />
        )}
        {nueva ? (
          <Cuenta
            titulo={`Cuenta nueva · CLABE ··${nueva.ultimos4}`}
            sub={`${nueva.banco} · se activa el ${nueva.activaEn}`}
            insignia={<Insignia tono="ambar">Por activar</Insignia>}
            accion={
              <Boton variante="secundario" onClick={() => setCancelar(true)} disabled={pendiente}>
                Cancelar cambio
              </Boton>
            }
          />
        ) : null}
        <Ejemplo>
          Por seguridad, cambiar la cuenta pide un código que llega al correo del dueño (o su contraseña) y la
          nueva se activa 24 h después. Los enlaces que ya se mandaron siguen con la anterior. Queda en la
          bitácora.
        </Ejemplo>
      </Seccion>

      <Seccion titulo="Plazos para el cliente">
        <Fila titulo="Datos y pago" sub="Tiempo para capturar y pagar después de validar">
          <Segmentos
            etiqueta="Plazo de Datos y pago"
            opciones={PLAZOS_DATOS_Y_PAGO.map((h) => ({
              valor: h as number,
              etiqueta: `${h} ${h === 1 ? "hora" : "horas"}`,
            }))}
            valor={plazo}
            alElegir={(h) => guardar("plazo_datos_y_pago", { horas: h })}
          />
        </Fila>
        <Fila titulo="Vigencia de la cotización" sub="Sin pasar del pago del hotel" id="vigencia">
          <CampoAjuste
            id="vigencia"
            valor={vigencia}
            texto={String}
            leer={leerEntero}
            modo="numeric"
            sufijo="días"
            alGuardar={(d) => guardar("vigencia_cotizacion", { dias: d })}
          />
        </Fila>
        <Fila titulo="Pagos flexibles" sub="Liquidar antes del viaje" id="flexibles">
          <CampoAjuste
            id="flexibles"
            valor={flexibles}
            texto={String}
            leer={leerEntero}
            modo="numeric"
            sufijo="días antes"
            alGuardar={(d) => guardar("pagos_flexibles", { dias_antes: d })}
          />
        </Fila>
        <Fila
          titulo="Recordatorios de pago"
          sub="Le llegan al equipo en Avisos, con la liga para mandarlos por WhatsApp"
          id="recordatorios"
        >
          <ListaAjuste
            id="recordatorios"
            opciones={RECORDATORIOS.map((r) => ({ valor: r.valor.join(), etiqueta: r.etiqueta }))}
            valor={recordatorios.join()}
            alElegir={(v) => guardar("recordatorios_cliente", { dias_antes: v.split(",").map(Number) })}
          />
        </Fila>
        <Fila titulo="Tarjeta" sub="Pasarela por definir">
          <Fijo apagado>Sin conectar</Fijo>
        </Fila>
      </Seccion>

      <CambiarCuenta
        abierto={cambiar}
        actual={vigente}
        alCerrar={() => setCambiar(false)}
        alCambiar={(activaEn) => {
          setCambiar(false);
          avisar(`Cuenta nueva guardada · se activa el ${activaEn}`);
        }}
      />
      <Dialogo
        abierto={cancelar}
        alCerrar={() => setCancelar(false)}
        titulo="Cancelar el cambio de cuenta"
        sub={nueva ? `La CLABE ··${nueva.ultimos4} no se activa y sigue la actual.` : undefined}
      >
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" className="h-10" onClick={() => setCancelar(false)}>
            Volver
          </Boton>
          <Boton
            variante="peligro"
            disabled={pendiente}
            onClick={() =>
              nueva &&
              iniciar(async () => {
                const r = await cancelarCambioCuenta(nueva.id);
                setCancelar(false);
                avisar("error" in r ? r.error : "Cambio cancelado · queda en la bitácora");
              })
            }
          >
            Cancelar cambio
          </Boton>
        </div>
      </Dialogo>
    </div>
  );
}

export function Cuenta({
  titulo,
  sub,
  insignia,
  accion,
  icono = <IconoFinanzas />,
}: {
  titulo: string;
  sub: string;
  insignia?: React.ReactNode;
  accion?: React.ReactNode;
  icono?: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={titulo}
      className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-3 shadow-borde"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-azul-tenue text-azul">
        {icono}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-sm font-semibold">{titulo}</b>
        <span className="text-[12.5px] text-tinta-3">{sub}</span>
      </div>
      {insignia}
      {accion}
    </div>
  );
}
