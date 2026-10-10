"use client";

import { useActionState, useState, useTransition } from "react";
import { iniciales } from "@/lib/texto";
import { ligaWhatsApp } from "@/lib/whatsapp";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Avatar, Insignia } from "@/components/ui/insignia";
import { IconoCandado, IconoCorreo, IconoExterno, IconoMas, IconoWhatsapp } from "@/components/iconos";
import { Opciones } from "@/components/catalogo/lista";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { AccionTexto, Dato, NotaCandado, PanelLateral, Seccion } from "@/components/catalogo/panel-lateral";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import { describirUsos, totalUsos } from "@/lib/usos";
import type { Proveedor } from "./datos";
import { desde, loQueLeCompras, nombreParaQue, PARA_QUE, subtitulo, type Permisos } from "./textos";
import {
  agregarContacto,
  archivarProveedor,
  eliminarProveedor,
  guardarNota,
  hacerPrincipal,
  quitarContacto,
} from "./acciones";
import { CuentasProveedor } from "./cuentas";

export function PanelProveedor({
  proveedor: p,
  posicion,
  alMover,
  alCerrar,
  alEditar,
  alAvisar,
  alArchivar,
  alEliminar,
  permisos,
}: {
  proveedor: Proveedor | null;
  posicion?: { actual: number; total: number };
  alMover: (paso: 1 | -1) => void;
  alCerrar: () => void;
  alEditar: (p: Proveedor) => void;
  alAvisar: (t: string) => void;
  alArchivar: (archivado: boolean) => void;
  alEliminar: () => void;
  permisos: Permisos;
}) {
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [pendiente, iniciar] = useTransition();
  const principal = p?.contactos[0];
  const wa = principal?.whatsapp ? ligaWhatsApp(principal.whatsapp) : null;

  return (
    <PanelLateral
      abierto={!!p}
      alCerrar={alCerrar}
      posicion={posicion}
      alMover={alMover}
      titulo={p?.nombre ?? ""}
      insignia={
        p ? (
          <>
            <Insignia tono="gris">{p.tipo === "plataforma" ? "Plataforma" : "Directo"}</Insignia>
            {p.archivado ? <Insignia tono="ambar">Archivado</Insignia> : null}
          </>
        ) : null
      }
      sub={
        p
          ? [subtitulo(p), desde(p), p.usos.viajes ? `${p.usos.viajes} viajes` : null]
              .filter(Boolean)
              .join(" · ")
          : null
      }
      acciones={
        p ? (
          <>
            {p.sitio ? (
              <a
                href={`https://${p.sitio}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
              >
                <IconoExterno tam={15} /> Abrir su sitio
              </a>
            ) : null}
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave"
              >
                <IconoWhatsapp tam={15} /> WhatsApp
              </a>
            ) : null}
            {permisos.editar ? (
              <Boton variante="secundario" onClick={() => alEditar(p)}>
                Editar proveedor
              </Boton>
            ) : null}
          </>
        ) : null
      }
      pie={
        p && (permisos.archivar || permisos.eliminar) ? (
          <>
            {permisos.archivar ? (
              p.archivado ? (
                <Boton
                  variante="secundario"
                  disabled={pendiente}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await archivarProveedor(p.id, false);
                      alAvisar(r.error ?? `${p.nombre} está activo otra vez`);
                      if (!r.error) alArchivar(false);
                    })
                  }
                >
                  Reactivar
                </Boton>
              ) : (
                <Boton variante="secundario" disabled={pendiente} onClick={() => setConfirmar("archivar")}>
                  Archivar
                </Boton>
              )
            ) : null}
            {permisos.eliminar ? (
              <Boton
                variante="texto"
                className="ml-auto"
                disabled={pendiente}
                onClick={() => setConfirmar("eliminar")}
              >
                Eliminar proveedor
              </Boton>
            ) : null}
          </>
        ) : null
      }
    >
      {p ? <Contenido key={p.id} p={p} permisos={permisos} alAvisar={alAvisar} alEditar={alEditar} /> : null}
      {p ? (
        <ConfirmarArchivo
          confirmacion={confirmar}
          nombre={p.nombre}
          alCerrar={() => setConfirmar(null)}
          archivar={[
            "Deja de aparecer al elegir proveedor en hoteles, actividades, servicios y el armador.",
            "Lo que ya está ligado a él y las reservas hechas no cambian.",
          ]}
          eliminar={
            totalUsos(p.usos) > 0
              ? {
                  permitido: false,
                  texto: `No se puede eliminar porque ${describirUsos(p.usos)}. Se puede archivar.`,
                }
              : {
                  permitido: true,
                  texto:
                    "Sale del catálogo junto con sus contactos y cuentas. Solo se puede porque nunca se usó.",
                }
          }
          alArchivar={(motivo) => {
            setConfirmar(null);
            iniciar(async () => {
              const r = await archivarProveedor(p.id, true, motivo);
              alAvisar(r.error ?? `${p.nombre} archivado · ya no aparece al elegir proveedor`);
              if (!r.error) alArchivar(true);
            });
          }}
          alEliminar={() => {
            setConfirmar(null);
            iniciar(async () => {
              const r = await eliminarProveedor(p.id);
              alAvisar(r.error ?? `${p.nombre} salió del catálogo`);
              if (!r.error) alEliminar();
            });
          }}
        />
      ) : null}
    </PanelLateral>
  );
}

function Contenido({
  p,
  permisos,
  alAvisar,
  alEditar,
}: {
  p: Proveedor;
  permisos: Permisos;
  alAvisar: (t: string) => void;
  alEditar: (p: Proveedor) => void;
}) {
  return (
    <>
      {p.archivado && p.motivoArchivo ? (
        <Seccion titulo="Archivado" tono="ambar">
          <p className="text-[13.5px]">{p.motivoArchivo}</p>
        </Seccion>
      ) : null}

      {p.tipo === "plataforma" ? (
        <Seccion
          titulo="Datos para reservar"
          accion={permisos.editar ? <AccionTexto onClick={() => alEditar(p)}>Editar</AccionTexto> : null}
        >
          <Dato etiqueta="Sitio">{p.sitio}</Dato>
          <Dato etiqueta="Número de agencia">{p.numeroAgencia ?? "Sin capturar"}</Dato>
          <p className="mt-1.5 text-[13px] text-tinta-3">Usuario y contraseña no se guardan aquí.</p>
        </Seccion>
      ) : null}

      {p.tipo === "directo" || p.cuentas.length > 0 ? (
        <CuentasProveedor proveedor={p} permisos={permisos} alAvisar={alAvisar} />
      ) : null}

      <Seccion titulo="Últimos acuerdos" extra="De sus reservas">
        <p className="text-[13.5px] text-tinta-2">Todavía no hay reservas con este proveedor.</p>
        <NotaCandado icono={<IconoCandado tam={14} />}>
          Cada reserva guarda su propio acuerdo: cuándo se paga, con qué, en qué moneda y qué cancelación
          aplica. Al cotizar, el armador propone el último como punto de partida y se puede cambiar. Desde
          Airoo no se hacen pagos.
        </NotaCandado>
      </Seccion>

      <Contactos p={p} permisos={permisos} alAvisar={alAvisar} />

      <Seccion titulo="Lo que le compras">
        <div className="flex flex-wrap gap-1.5">
          {loQueLeCompras(p).map((x) => (
            <span key={x} className="rounded-md bg-fondo px-2 py-0.5 text-xs font-bold text-tinta-2">
              {x}
            </span>
          ))}
        </div>
      </Seccion>

      <Nota p={p} editable={permisos.editar} alAvisar={alAvisar} />
    </>
  );
}

function Contactos({
  p,
  permisos,
  alAvisar,
}: {
  p: Proveedor;
  permisos: Permisos;
  alAvisar: (t: string) => void;
}) {
  const [agregando, setAgregando] = useState(false);
  const [paraQue, setParaQue] = useState<string>("reservas");
  const [estado, accion, enviando] = useActionState(
    async (prev: Awaited<ReturnType<typeof agregarContacto>> | undefined, datos: FormData) => {
      const r = await agregarContacto(p.id, prev, datos);
      if (r.ok) {
        setAgregando(false);
        alAvisar(`Contacto agregado a ${p.nombre}`);
      }
      return r;
    },
    undefined,
  );
  const [pendiente, iniciar] = useTransition();

  return (
    <Seccion
      titulo="Contactos"
      accion={
        permisos.editar && !agregando ? (
          <AccionTexto onClick={() => setAgregando(true)}>
            <IconoMas tam={14} /> Agregar
          </AccionTexto>
        ) : null
      }
    >
      {p.contactos.length === 0 && !agregando ? (
        <p className="text-[13.5px] text-tinta-2">
          Sin contactos todavía. El primero que se agregue queda como principal.
        </p>
      ) : null}
      <ul>
        {p.contactos.map((c) => (
          <li key={c.id} className="border-t border-linea py-2.5 first:border-t-0 first:pt-0.5">
            <div className="flex items-center gap-2.5">
              <Avatar iniciales={iniciales(c.nombre)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <b className="font-semibold">{c.nombre}</b>
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-semibold ${c.principal ? "bg-azul-tenue text-azul-oscuro" : "bg-[#eef1f5] text-tinta-2"}`}
                  >
                    {nombreParaQue(c.paraQue)}
                    {c.principal ? " · principal" : ""}
                  </span>
                </div>
                {c.horario ? <span className="text-[12.5px] text-tinta-3">{c.horario}</span> : null}
              </div>
            </div>
            <div className="mt-1.5 ml-[38px] flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-tinta-2">
              {c.whatsapp ? (
                <a
                  href={ligaWhatsApp(c.whatsapp) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-azul-oscuro"
                >
                  <IconoWhatsapp tam={13} className="text-tinta-3" /> {c.whatsapp}
                </a>
              ) : null}
              {c.correo ? (
                <a
                  href={`mailto:${c.correo}`}
                  className="inline-flex items-center gap-1.5 hover:text-azul-oscuro"
                >
                  <IconoCorreo tam={13} className="text-tinta-3" /> {c.correo}
                </a>
              ) : null}
              {permisos.editar ? (
                <span className="ml-auto inline-flex gap-1">
                  {!c.principal ? (
                    <AccionTexto disabled={pendiente} onClick={() => iniciar(() => hacerPrincipal(c.id))}>
                      Hacer principal
                    </AccionTexto>
                  ) : null}
                  <AccionTexto
                    disabled={pendiente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await quitarContacto(c.id);
                        alAvisar(r.error ?? `${c.nombre} ya no está en los contactos`);
                      })
                    }
                  >
                    Quitar
                  </AccionTexto>
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {agregando ? (
        <form
          onSubmit={enviarSinVaciar(accion)}
          className="mt-2 flex flex-col gap-3 border-t border-linea pt-3"
        >
          <Campo etiqueta="Nombre" name="nombre" placeholder="Ej. Jorge Pérez" required autoFocus />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Para qué le escribes</span>
            <Opciones
              etiqueta="Para qué le escribes"
              opciones={PARA_QUE.map((x) => ({ valor: x.valor, etiqueta: x.etiqueta }))}
              elegidas={[paraQue]}
              alCambiar={([v]) => setParaQue(v)}
            />
            <input type="hidden" name="paraQue" value={paraQue} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="WhatsApp" name="whatsapp" placeholder="+52 998 …" inputMode="tel" />
            <Campo etiqueta="Correo" name="correo" type="email" placeholder="nombre@proveedor.com" />
          </div>
          <Campo
            etiqueta="Horario · opcional"
            name="horario"
            placeholder="Ej. Lun a vie, 9:00 AM a 6:00 PM"
          />
          {estado?.error ? (
            <p role="alert" className="text-[13px] text-rojo">
              {estado.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setAgregando(false)}>
              Cancelar
            </Boton>
            <Boton type="submit" disabled={enviando} className="h-[34px] text-[13px]">
              {enviando ? "Guardando…" : "Guardar contacto"}
            </Boton>
          </div>
        </form>
      ) : null}
    </Seccion>
  );
}

function Nota({ p, editable, alAvisar }: { p: Proveedor; editable: boolean; alAvisar: (t: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.notaInterna ?? "");
  const [pendiente, iniciar] = useTransition();
  return (
    <Seccion
      titulo="Nota interna"
      extra={
        <span className="inline-flex items-center gap-1">
          <IconoCandado tam={12} /> Solo el equipo
        </span>
      }
      accion={
        editable && !editando ? (
          <AccionTexto onClick={() => setEditando(true)}>
            {p.notaInterna ? "Editar" : "Agregar nota"}
          </AccionTexto>
        ) : null
      }
    >
      {editando ? (
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor="nota-proveedor">
            Nota interna
          </label>
          <textarea
            id="nota-proveedor"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Nota para el equipo"
            className="rounded-campo bg-tarjeta px-3 py-2.5 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
          />
          <div className="flex justify-end gap-2">
            <Boton
              variante="secundario"
              onClick={() => {
                setTexto(p.notaInterna ?? "");
                setEditando(false);
              }}
            >
              Cancelar
            </Boton>
            <Boton
              className="h-[34px] text-[13px]"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await guardarNota(p.id, texto);
                  alAvisar(r.error ?? "Nota guardada · la ve todo el equipo");
                  if (!r.error) setEditando(false);
                })
              }
            >
              Guardar nota
            </Boton>
          </div>
        </div>
      ) : (
        <p className={`text-[13.5px] ${p.notaInterna ? "" : "text-tinta-3"}`}>
          {p.notaInterna ??
            "Sin nota todavía. Aquí va lo que conviene saber antes de reservarle: requisitos, costumbres, horarios en que sí contestan."}
        </p>
      )}
    </Seccion>
  );
}
