"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Opciones } from "@/components/catalogo/lista";
import { enviarSinVaciar } from "@/components/ui/enviar";
import type { Proveedor } from "./datos";
import { CATEGORIAS, PARA_QUE, type Permisos } from "./textos";
import { guardarProveedor } from "./acciones";

const MODOS = [
  {
    valor: "plataforma",
    etiqueta: "En su plataforma",
    detalle: "Airoo tiene cuenta de agencia en su sitio y ahí se reserva.",
  },
  {
    valor: "directo",
    etiqueta: "Directo con ellos",
    detalle: "DMC, operador u hotel: se reserva por WhatsApp, correo o teléfono.",
  },
] as const;

export function FormularioProveedor({
  abierto,
  editar,
  permisos,
  alCerrar,
  alGuardar,
}: {
  abierto: boolean;
  editar: Proveedor | null;
  permisos: Permisos;
  alCerrar: () => void;
  alGuardar: (id: string, mensaje: string) => void;
}) {
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      ancho={800}
      titulo={editar ? `Editar ${editar.nombre}` : "Nuevo proveedor"}
      sub="Solo datos: quién es, cómo se le contacta y dónde recibe. Lo que se acuerda en cada reserva se captura en esa reserva."
    >
      <Formulario
        key={editar?.id ?? "nuevo"}
        editar={editar}
        permisos={permisos}
        alCerrar={alCerrar}
        alGuardar={alGuardar}
      />
    </Dialogo>
  );
}

function Formulario({
  editar,
  permisos,
  alCerrar,
  alGuardar,
}: {
  editar: Proveedor | null;
  permisos: Permisos;
  alCerrar: () => void;
  alGuardar: (id: string, mensaje: string) => void;
}) {
  const [tipo, setTipo] = useState<"plataforma" | "directo">(editar?.tipo ?? "plataforma");
  const [categorias, setCategorias] = useState<string[]>(editar?.categorias ?? []);
  const [paraQue, setParaQue] = useState<string>("reservas");
  const [tipoCuenta, setTipoCuenta] = useState<"clabe" | "tarjeta">("clabe");
  const [estado, accion, enviando] = useActionState(
    async (prev: Awaited<ReturnType<typeof guardarProveedor>>, datos: FormData) => {
      const r = await guardarProveedor(prev, datos);
      if (r && "guardado" in r) alGuardar(r.id, r.mensaje);
      return r;
    },
    undefined,
  );
  const parecidos = estado && "parecidos" in estado ? estado.parecidos : null;

  return (
    <form onSubmit={enviarSinVaciar(accion)} className="flex flex-col">
      {editar ? <input type="hidden" name="id" value={editar.id} /> : null}
      <div className="grid max-h-[calc(100dvh-260px)] grid-cols-1 gap-x-6 gap-y-4 overflow-auto pr-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold tracking-[0.05em] text-tinta-3 uppercase">Proveedor</h3>
          <Campo
            etiqueta="Nombre"
            name="nombre"
            defaultValue={editar?.nombre}
            placeholder="Ej. Hotel Casa Azul"
            required
            autoFocus
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Qué le compras</span>
            <Opciones
              etiqueta="Qué le compras"
              varias
              opciones={CATEGORIAS.map((c) => ({ valor: c, etiqueta: c }))}
              elegidas={categorias}
              alCambiar={setCategorias}
            />
            {categorias.map((c) => (
              <input key={c} type="hidden" name="categorias" value={c} />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Cómo le reservas</span>
            <div role="radiogroup" aria-label="Cómo le reservas" className="grid grid-cols-2 gap-2">
              {MODOS.map((m) => {
                const on = tipo === m.valor;
                return (
                  <button
                    key={m.valor}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTipo(m.valor)}
                    className={`cursor-pointer rounded-xl px-3 py-2.5 text-left ${on ? "bg-azul-tenue shadow-[inset_0_0_0_1.5px_var(--color-azul)]" : "shadow-borde"}`}
                  >
                    <b className={`block text-sm font-bold ${on ? "text-azul-oscuro" : ""}`}>{m.etiqueta}</b>
                    <span className="mt-0.5 block text-xs leading-snug text-tinta-3">{m.detalle}</span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="tipo" value={tipo} />
          </div>

          {tipo === "plataforma" ? (
            <>
              <Campo
                etiqueta="Sitio para agencias"
                name="sitio"
                defaultValue={editar?.sitio ?? ""}
                placeholder="Ej. agencias.proveedor.com"
              />
              <Campo
                etiqueta="Número de agencia"
                name="numeroAgencia"
                defaultValue={editar?.numeroAgencia ?? ""}
                placeholder="Ej. 1029384"
                ayuda="Usuario y contraseña no se guardan aquí. Cómo se paga cada reserva depende de lo que ofrezca la plataforma en ese momento."
              />
            </>
          ) : editar ? (
            <p className="text-[13px] text-tinta-2">
              Las cuentas donde recibe se agregan y cambian desde su ficha.
            </p>
          ) : permisos.cuentas ? (
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold">
                Cuenta donde recibe <span className="font-medium text-tinta-3">· opcional</span>
              </span>
              <Opciones
                etiqueta="Tipo de cuenta"
                opciones={[
                  { valor: "clabe", etiqueta: "CLABE" },
                  { valor: "tarjeta", etiqueta: "Tarjeta" },
                ]}
                elegidas={[tipoCuenta]}
                alCambiar={([v]) => setTipoCuenta(v)}
              />
              <input type="hidden" name="cuenta_tipo" value={tipoCuenta} />
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Banco" name="cuenta_banco" placeholder="Ej. BBVA" />
                <Campo
                  etiqueta={tipoCuenta === "clabe" ? "CLABE" : "Número de tarjeta"}
                  name="cuenta_numero"
                  placeholder={tipoCuenta === "clabe" ? "18 dígitos" : "16 dígitos"}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <Campo
                etiqueta="A nombre de"
                name="cuenta_aNombreDe"
                placeholder="Como aparece en el estado de cuenta"
                ayuda="Antes del primer pago se confirma con una llamada al número del proveedor. Si en cada reserva mandan liga de pago, esto se puede dejar vacío. Se pueden agregar más cuentas desde su ficha."
              />
            </div>
          ) : (
            <p className="text-[13px] text-tinta-2">
              La cuenta donde recibe la registra el dueño desde la ficha del proveedor.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {editar ? (
            <>
              <h3 className="text-xs font-bold tracking-[0.05em] text-tinta-3 uppercase">Contactos</h3>
              <p className="text-[13px] text-tinta-2">
                {editar.contactos.length === 1
                  ? "1 contacto registrado."
                  : `${editar.contactos.length} contactos registrados.`}{" "}
                Se agregan y cambian desde la ficha, en Contactos.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xs font-bold tracking-[0.05em] text-tinta-3 uppercase">
                Contacto principal
              </h3>
              <Campo etiqueta="Nombre" name="contacto_nombre" placeholder="Ej. Lucía Ruiz" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">Para qué le escribes</span>
                <Opciones
                  etiqueta="Para qué le escribes al contacto principal"
                  opciones={PARA_QUE.map((x) => ({ valor: x.valor, etiqueta: x.etiqueta }))}
                  elegidas={[paraQue]}
                  alCambiar={([v]) => setParaQue(v)}
                />
                <input type="hidden" name="contacto_paraQue" value={paraQue} />
              </div>
              <Campo etiqueta="WhatsApp" name="contacto_whatsapp" placeholder="+52 998 …" inputMode="tel" />
              <Campo
                etiqueta="Correo"
                name="contacto_correo"
                type="email"
                placeholder="reservas@proveedor.com"
                ayuda="Los demás contactos (pagos, emergencias) se agregan desde su ficha."
              />
            </>
          )}
          <AreaTexto
            etiqueta="Nota interna"
            name="notaInterna"
            defaultValue={editar?.notaInterna ?? ""}
            placeholder="Ej. Para grupos piden la lista de huéspedes 15 días antes."
            ayuda="Solo la ve el equipo. Lo que conviene saber antes de reservarle."
          />
        </div>
      </div>

      {parecidos ? (
        <div role="status" className="mt-4 rounded-campo bg-ambar-tenue px-3 py-3 text-[13px] text-ambar">
          <p className="font-semibold">Ya hay proveedores con nombre parecido</p>
          <ul className="mt-1 text-tinta">
            {parecidos.map((x) => (
              <li key={x.id}>
                {x.nombre}
                {x.archivado ? <span className="text-tinta-3"> (archivado)</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-1">Si es otro proveedor, se puede crear de todos modos.</p>
          <input type="hidden" name="confirmar" value="si" />
        </div>
      ) : null}
      {estado && "error" in estado ? (
        <p role="alert" className="mt-3 text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2 border-t border-linea pt-4">
        <Boton variante="secundario" className="h-10" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton type="submit" disabled={enviando}>
          {enviando
            ? "Guardando…"
            : editar
              ? "Guardar cambios"
              : parecidos
                ? "Crear de todos modos"
                : "Crear proveedor"}
        </Boton>
      </div>
    </form>
  );
}
