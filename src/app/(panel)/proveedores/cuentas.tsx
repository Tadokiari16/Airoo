"use client";

// Cuentas donde recibe un proveedor. Son datos para copiar sin errores, no una
// regla. Una cuenta nueva o cambiada queda pendiente hasta confirmarla por
// llamada al número que ya estaba registrado; solo el dueño la aprueba.

import { useActionState, useState, useTransition } from "react";
import { NOMBRE_TIPO_CUENTA, enmascarar } from "@/lib/cuentas";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Insignia } from "@/components/ui/insignia";
import { IconoCopiar, IconoMas, IconoOjo, IconoPalomita } from "@/components/iconos";
import { Opciones } from "@/components/catalogo/lista";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { AccionTexto, Seccion } from "@/components/catalogo/panel-lateral";
import type { Cuenta, Proveedor } from "./datos";
import type { Permisos } from "./textos";
import { cuentaCompleta, registrarCuenta, revisarCuenta } from "./acciones";

export function CuentasProveedor({
  proveedor: p,
  permisos,
  alAvisar,
}: {
  proveedor: Proveedor;
  permisos: Permisos;
  alAvisar: (t: string) => void;
}) {
  // null: sin formulario; "nueva": cuenta adicional; id: cambio de esa cuenta.
  const [capturando, setCapturando] = useState<null | "nueva" | string>(null);
  const [verificando, setVerificando] = useState<Cuenta | null>(null);
  const verificadas = p.cuentas.filter((c) => c.estado === "verificada");
  const pendientes = p.cuentas.filter((c) => c.estado === "pendiente");

  return (
    <Seccion
      titulo="Cuentas donde recibe"
      extra="Dueño"
      accion={
        permisos.cuentas && !capturando ? (
          <AccionTexto onClick={() => setCapturando("nueva")}>
            <IconoMas tam={14} /> Agregar
          </AccionTexto>
        ) : null
      }
    >
      <div className="flex flex-col gap-2">
        {verificadas.map((c) => {
          const cambio = pendientes.find((x) => x.reemplazaA === c.id);
          return (
            <div key={c.id} className="flex flex-col gap-2">
              <TarjetaCuenta cuenta={c} permisos={permisos} alAvisar={alAvisar}>
                {permisos.cuentas && !cambio ? (
                  <AccionTexto onClick={() => setCapturando(c.id)}>Cambiar</AccionTexto>
                ) : null}
              </TarjetaCuenta>
              {cambio ? (
                <TarjetaCuenta cuenta={cambio} permisos={permisos} alAvisar={alAvisar} pendiente>
                  {permisos.cuentas ? (
                    <AccionTexto onClick={() => setVerificando(cambio)}>Verificar cambio</AccionTexto>
                  ) : null}
                </TarjetaCuenta>
              ) : null}
            </div>
          );
        })}
        {pendientes
          .filter((x) => !x.reemplazaA || !verificadas.some((v) => v.id === x.reemplazaA))
          .map((c) => (
            <TarjetaCuenta key={c.id} cuenta={c} permisos={permisos} alAvisar={alAvisar} pendiente>
              {permisos.cuentas ? (
                <AccionTexto onClick={() => setVerificando(c)}>Verificar</AccionTexto>
              ) : null}
            </TarjetaCuenta>
          ))}
        {p.cuentas.length === 0 && !capturando ? (
          <p className="text-[13.5px] text-tinta-2">
            Sin cuentas guardadas. Si en cada reserva mandan una liga de pago, no hace falta ninguna.
          </p>
        ) : null}
        {capturando ? (
          <FormularioCuenta
            proveedorId={p.id}
            reemplazaA={capturando === "nueva" ? null : capturando}
            alCancelar={() => setCapturando(null)}
            alGuardar={() => {
              setCapturando(null);
              alAvisar("Cuenta guardada · queda por verificar con una llamada antes de usarla");
            }}
          />
        ) : null}
      </div>
      <p className="mt-2 text-[12.5px] text-tinta-3">
        Son datos para copiar sin errores, no una regla: en cada pago se elige a qué cuenta se transfirió. Una
        cuenta nueva o cambiada se confirma por llamada al número que ya estaba registrado.
      </p>
      <VerificarCuenta
        key={verificando?.id ?? "ninguna"}
        proveedor={p}
        cuenta={verificando}
        alCerrar={() => setVerificando(null)}
        alTerminar={(m) => {
          setVerificando(null);
          alAvisar(m);
        }}
      />
    </Seccion>
  );
}

function TarjetaCuenta({
  cuenta: c,
  permisos,
  alAvisar,
  pendiente,
  children,
}: {
  cuenta: Cuenta;
  permisos: Permisos;
  alAvisar: (t: string) => void;
  pendiente?: boolean;
  children?: React.ReactNode;
}) {
  const [completa, setCompleta] = useState<string | null>(null);
  const [cargando, iniciar] = useTransition();
  const tipo = NOMBRE_TIPO_CUENTA[c.tipo];

  const pedir = (para: "ver" | "copiar") =>
    iniciar(async () => {
      const r = await cuentaCompleta(c.id, para);
      if (r.error || !r.numero) return alAvisar(r.error ?? "No se pudo leer la cuenta");
      if (para === "ver") return setCompleta(r.numero);
      try {
        await navigator.clipboard.writeText(r.numero.replace(/\s/g, ""));
        alAvisar(`${tipo} copiada · queda en la bitácora`);
      } catch {
        setCompleta(r.numero);
        alAvisar("No se pudo copiar; el número quedó a la vista");
      }
    });

  return (
    <div
      aria-label={`${tipo} ${c.banco} ${enmascarar(c.ultimos4)}`}
      className={`flex flex-col gap-[3px] rounded-xl px-3.5 py-3 ${pendiente ? "bg-ambar-tenue" : "bg-[#f6f8fb]"}`}
    >
      <div className="flex items-center gap-2">
        <b className="text-[14.5px] font-semibold">{c.banco}</b>
        {pendiente ? (
          <Insignia tono="ambar">Por verificar</Insignia>
        ) : (
          <Insignia tono="verde">Verificada</Insignia>
        )}
      </div>
      <span className="num text-[13.5px]">
        {tipo} {completa ?? enmascarar(c.ultimos4)}
      </span>
      <span className={`text-[12.5px] ${pendiente ? "text-[#5e3906]" : "text-tinta-2"}`}>{c.aNombreDe}</span>
      <span className={`text-[12.5px] ${pendiente ? "text-[#5e3906]" : "text-tinta-2"}`}>
        {c.historial}
        {pendiente
          ? c.telefonoLlamada
            ? ` · se confirma llamando al ${c.telefonoLlamada}`
            : " · falta un teléfono del proveedor para confirmarla"
          : null}
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {permisos.verCompleta && !completa ? (
          <AccionTexto disabled={cargando} onClick={() => pedir("ver")}>
            <IconoOjo tam={14} /> Ver completa
          </AccionTexto>
        ) : null}
        {permisos.verCompleta ? (
          <AccionTexto disabled={cargando} onClick={() => pedir("copiar")}>
            <IconoCopiar tam={14} /> Copiar completa
          </AccionTexto>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function FormularioCuenta({
  proveedorId,
  reemplazaA,
  alCancelar,
  alGuardar,
}: {
  proveedorId: string;
  reemplazaA: string | null;
  alCancelar: () => void;
  alGuardar: () => void;
}) {
  const [tipo, setTipo] = useState<"clabe" | "tarjeta">("clabe");
  const [estado, accion, enviando] = useActionState(
    async (prev: Awaited<ReturnType<typeof registrarCuenta>> | undefined, datos: FormData) => {
      const r = await registrarCuenta(proveedorId, reemplazaA, prev, datos);
      if (r.ok) alGuardar();
      return r;
    },
    undefined,
  );

  return (
    <form
      onSubmit={enviarSinVaciar(accion)}
      className="flex flex-col gap-3 rounded-xl px-3.5 py-3 shadow-borde"
    >
      <b className="text-[13.5px]">
        {reemplazaA ? "Cuenta nueva que pidió el proveedor" : "Cuenta donde recibe"}
      </b>
      <Opciones
        etiqueta="Tipo de cuenta"
        opciones={[
          { valor: "clabe", etiqueta: "CLABE" },
          { valor: "tarjeta", etiqueta: "Tarjeta" },
        ]}
        elegidas={[tipo]}
        alCambiar={([v]) => setTipo(v)}
      />
      <input type="hidden" name="cuenta_tipo" value={tipo} />
      <Campo etiqueta="Banco" name="cuenta_banco" placeholder="Ej. BBVA" required />
      <Campo
        etiqueta={tipo === "clabe" ? "CLABE" : "Número de tarjeta"}
        name="cuenta_numero"
        placeholder={tipo === "clabe" ? "18 dígitos" : "16 dígitos"}
        inputMode="numeric"
        autoComplete="off"
        required
      />
      <Campo
        etiqueta="A nombre de"
        name="cuenta_aNombreDe"
        placeholder="Como aparece en el estado de cuenta"
        required
      />
      <p className="text-[12.5px] text-tinta-3">
        {reemplazaA
          ? "Hasta aprobarla se sigue usando la anterior. Se confirma llamando al número que ya estaba registrado, no al que venga en el mensaje."
          : "Antes del primer pago se confirma con una llamada al número del proveedor."}
      </p>
      {estado?.error ? (
        <p role="alert" className="text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" disabled={enviando} className="h-[34px] text-[13px]">
          {enviando ? "Guardando…" : "Guardar cuenta"}
        </Boton>
      </div>
    </form>
  );
}

function VerificarCuenta({
  proveedor: p,
  cuenta,
  alCerrar,
  alTerminar,
}: {
  proveedor: Proveedor;
  cuenta: Cuenta | null;
  alCerrar: () => void;
  alTerminar: (mensaje: string) => void;
}) {
  const [llamada, setLlamada] = useState(false);
  const [estadoCuenta, setEstadoCuenta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const anterior = cuenta?.reemplazaA ? p.cuentas.find((c) => c.id === cuenta.reemplazaA) : null;

  if (!cuenta)
    return (
      <Dialogo abierto={false} alCerrar={alCerrar} titulo="Verificar cuenta nueva">
        {null}
      </Dialogo>
    );
  const tipo = NOMBRE_TIPO_CUENTA[cuenta.tipo];
  const decidir = (aprobar: boolean) =>
    iniciar(async () => {
      const r = await revisarCuenta(cuenta.id, {
        aprobar,
        confirmoPorTelefono: llamada,
        estadoCuentaCoincide: estadoCuenta,
      });
      if (r.error) setError(r.error);
      else alTerminar(r.mensaje ?? "Listo");
    });

  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      ancho={520}
      titulo="Verificar cuenta nueva"
      sub={
        anterior
          ? `${p.nombre} pidió pagar a otra cuenta. Hasta aprobarla, se sigue usando la anterior.`
          : `${p.nombre} registró una cuenta para recibir pagos. No se usa hasta confirmarla.`
      }
    >
      <div className="flex flex-col gap-3">
        <div className={`grid gap-2 ${anterior ? "grid-cols-2" : "grid-cols-1"}`}>
          {anterior ? (
            <div className="flex flex-col gap-[3px] rounded-xl bg-[#f6f8fb] px-3 py-2.5">
              <span className="text-[11.5px] font-bold tracking-[0.05em] text-tinta-3 uppercase">Actual</span>
              <b className="font-semibold">{anterior.banco}</b>
              <span className="num text-[13px] text-tinta-2">
                {NOMBRE_TIPO_CUENTA[anterior.tipo]} {enmascarar(anterior.ultimos4)}
              </span>
            </div>
          ) : null}
          <div className="flex flex-col gap-[3px] rounded-xl bg-ambar-tenue px-3 py-2.5 text-[#5e3906]">
            <span className="text-[11.5px] font-bold tracking-[0.05em] uppercase">Nueva</span>
            <b className="font-semibold text-tinta">{cuenta.banco}</b>
            <span className="num text-[13px]">
              {tipo} {enmascarar(cuenta.ultimos4)} · {cuenta.aNombreDe}
            </span>
          </div>
        </div>

        <Casilla
          marcada={llamada}
          alCambiar={setLlamada}
          titulo="Confirmé el cambio por teléfono"
          detalle={
            cuenta.telefonoLlamada
              ? `Llamando al ${cuenta.telefonoLlamada}, el número que ya tenías; no al que viene en el correo.`
              : "No hay un teléfono registrado del proveedor. Primero se agrega un contacto con su número."
          }
          deshabilitada={!cuenta.telefonoLlamada}
        />
        <Casilla
          marcada={estadoCuenta}
          alCambiar={setEstadoCuenta}
          titulo="El estado de cuenta coincide"
          detalle={`La carátula de ${cuenta.banco} está a nombre de ${cuenta.aNombreDe}.`}
        />
        <p className="text-[13px] text-tinta-2">
          El primer pago a la cuenta nueva queda marcado para revisión en Finanzas.
        </p>
        {error ? (
          <p role="alert" className="text-[13px] text-rojo">
            {error}
          </p>
        ) : null}
        <div className="mt-2 flex justify-end gap-2 border-t border-linea pt-3.5">
          <Boton variante="secundario" className="h-10" disabled={pendiente} onClick={() => decidir(false)}>
            {anterior ? "Rechazar cambio" : "Rechazar cuenta"}
          </Boton>
          <Boton disabled={pendiente || !llamada || !estadoCuenta} onClick={() => decidir(true)}>
            Aprobar cuenta nueva
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}

function Casilla({
  marcada,
  alCambiar,
  titulo,
  detalle,
  deshabilitada,
}: {
  marcada: boolean;
  alCambiar: (v: boolean) => void;
  titulo: string;
  detalle: string;
  deshabilitada?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 shadow-borde ${marcada ? "bg-verde-tenue" : ""} ${deshabilitada ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={marcada}
        disabled={deshabilitada}
        onChange={(e) => alCambiar(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-azul ${marcada ? "bg-verde text-white" : "bg-tarjeta shadow-borde"}`}
      >
        {marcada ? <IconoPalomita tam={13} /> : null}
      </span>
      <span>
        <b className="block font-semibold">{titulo}</b>
        <span className="text-[12.5px] text-tinta-2">{detalle}</span>
      </span>
    </label>
  );
}
