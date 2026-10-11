"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ligaWhatsApp } from "@/lib/whatsapp";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Insignia } from "@/components/ui/insignia";
import { IconoMas, IconoWhatsapp } from "@/components/iconos";
import { Bloque } from "@/components/catalogo/bloque";
import { FormularioProveedor } from "./formulario";
import type { Permisos as PermisosProveedor } from "./textos";

const LIGA =
  "inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline";

type Resultado = { error?: string; mensaje?: string };

/** Un proveedor ligado a una actividad o un servicio. Sus datos se leen de Proveedores. */
export type LigaProveedor = {
  id: string;
  proveedorId: string;
  proveedor: string;
  tipo: "plataforma" | "directo";
  idExterno: string | null;
  contacto: { nombre: string; paraQue: string; whatsapp: string | null; correo: string | null } | null;
};

export type OpcionLigable = { id: string; nombre: string; tipo: "plataforma" | "directo" };

/**
 * Proveedores ligados a una actividad o un servicio. Se guardan al momento,
 * como las fotos: no esperan a «Guardar» de la ficha.
 *
 * `sinProveedor` es la otra salida: «Lo paga el cliente en el lugar» en
 * actividades, «Varía por reserva» en servicios. Al encenderla se quitan los
 * proveedores ligados.
 */
export function DondeReservar({
  objeto,
  ligados,
  proveedores,
  editable,
  permisosProveedor,
  alAvisar,
  ligar,
  quitar,
  guardarId,
  sinProveedor,
}: {
  /** «esta actividad», «este servicio» */
  objeto: string;
  ligados: LigaProveedor[];
  proveedores: OpcionLigable[];
  editable: boolean;
  permisosProveedor: PermisosProveedor;
  alAvisar: (t: string) => void;
  ligar: (proveedorId: string) => Promise<Resultado>;
  quitar: (ligaId: string) => Promise<Resultado>;
  guardarId: (ligaId: string, idExterno: string) => Promise<Resultado>;
  sinProveedor: {
    activo: boolean;
    cambiar: (si: boolean) => Promise<Resultado>;
    /** Botón para encenderla y para volver. */
    encender: string;
    apagar: string;
    /** Lo que se lee con ella encendida, y sin proveedores. */
    texto: string;
    vacio: string;
    avisoEncender: string;
    avisoApagar: string;
    confirmar: { titulo: string; sub: string; nota: string };
  };
}) {
  const [eligiendo, setEligiendo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const libres = proveedores.filter((p) => !ligados.some((l) => l.proveedorId === p.id));
  const sp = sinProveedor;

  const correr = (f: () => Promise<Resultado>, ok = "") =>
    iniciar(async () => {
      const r = await f();
      const t = r.error ?? r.mensaje ?? ok;
      if (t) alAvisar(t);
    });
  const cambiar = (si: boolean) =>
    correr(
      async () => {
        const r = await sp.cambiar(si);
        setConfirmar(false);
        return r;
      },
      si ? sp.avisoEncender : sp.avisoApagar,
    );

  return (
    <Bloque
      id="reservar"
      titulo="Dónde se puede reservar"
      soloEquipo
      descripcion="Se liga a proveedores de Proveedores; sus datos se consultan desde ahí, no se copian. No obliga a reservar en ninguno: el proveedor, la moneda, el pago y la cancelación de cada reserva se eligen en el armador."
    >
      {ligados.length ? (
        <ul className="border-t border-linea">
          {ligados.map((l) => {
            const wa = l.contacto?.whatsapp ? ligaWhatsApp(l.contacto.whatsapp) : null;
            return (
              <li key={l.id} aria-label={l.proveedor} className="border-b border-linea py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <b className="text-[14.5px] font-semibold">{l.proveedor}</b>
                      <Insignia tono="gris">{l.tipo === "plataforma" ? "Plataforma" : "Directo"}</Insignia>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-tinta-3">
                      {l.contacto ? (
                        <span>
                          {l.contacto.nombre} · {l.contacto.paraQue}
                        </span>
                      ) : (
                        <span>Sin contacto registrado</span>
                      )}
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-tinta"
                        >
                          <IconoWhatsapp tam={13} /> {l.contacto!.whatsapp}
                        </a>
                      ) : l.contacto?.correo ? (
                        <span>{l.contacto.correo}</span>
                      ) : null}
                    </p>
                  </div>
                  <Link
                    href={`/proveedores?p=${l.proveedorId}`}
                    className="text-[13px] font-semibold text-azul-oscuro hover:underline"
                  >
                    Ver proveedor
                  </Link>
                  {editable ? (
                    <button
                      type="button"
                      aria-label={`Quitar ${l.proveedor}`}
                      disabled={pendiente}
                      onClick={() => correr(() => quitar(l.id))}
                      className="cursor-pointer text-[13px] font-semibold text-tinta-2 hover:text-rojo hover:underline"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
                <label className="mt-2 flex h-10 w-[340px] max-w-full items-center gap-2 rounded-campo bg-tarjeta px-3 text-sm shadow-borde focus-within:shadow-[inset_0_0_0_1.5px_var(--color-azul)]">
                  <input
                    aria-label={`ID en ${l.proveedor}`}
                    defaultValue={l.idExterno ?? ""}
                    disabled={!editable}
                    placeholder="Opcional"
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (l.idExterno ?? ""))
                        correr(() => guardarId(l.id, e.target.value), "ID guardado");
                    }}
                    className="num min-w-0 flex-1 bg-transparent outline-none placeholder:text-tinta-3"
                  />
                  <span className="shrink-0 text-[12.5px] text-tinta-3">
                    {l.tipo === "plataforma" ? `ID en ${l.proveedor}` : "Código o referencia"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13.5px] text-tinta-2">{sp.activo ? sp.texto : sp.vacio}</p>
      )}

      {editable ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {sp.activo ? null : eligiendo ? (
            <select
              autoFocus
              aria-label="Proveedor para ligar"
              defaultValue=""
              disabled={pendiente}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setEligiendo(false);
                correr(() => ligar(id));
              }}
              onBlur={() => setEligiendo(false)}
              className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde"
            >
              <option value="">Elegir proveedor</option>
              {(["plataforma", "directo"] as const).map((t) => (
                <optgroup key={t} label={t === "plataforma" ? "Plataformas" : "Directos"}>
                  {libres
                    .filter((p) => p.tipo === t)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <>
              <button type="button" onClick={() => setEligiendo(true)} className={LIGA}>
                <IconoMas tam={15} /> Ligar proveedor
              </button>
              <button type="button" onClick={() => setCreando(true)} className={LIGA}>
                <IconoMas tam={15} /> Crear proveedor nuevo
              </button>
            </>
          )}
          <button
            type="button"
            disabled={pendiente}
            onClick={() => (sp.activo ? cambiar(false) : ligados.length ? setConfirmar(true) : cambiar(true))}
            className="cursor-pointer text-[13px] font-semibold text-tinta-2 hover:text-tinta hover:underline"
          >
            {sp.activo ? sp.apagar : sp.encender}
          </button>
        </div>
      ) : null}

      {/* El alta de proveedor es otro formulario: sus cambios no son de la ficha. */}
      <div onChange={(e) => e.stopPropagation()}>
        <FormularioProveedor
          abierto={creando}
          editar={null}
          permisos={permisosProveedor}
          alCerrar={() => setCreando(false)}
          alGuardar={(id) => {
            setCreando(false);
            correr(async () => {
              const r = await ligar(id);
              return r.error ? r : { mensaje: `Proveedor creado y ligado a ${objeto}` };
            });
          }}
        />
      </div>

      <Dialogo
        abierto={confirmar}
        alCerrar={() => setConfirmar(false)}
        titulo={sp.confirmar.titulo}
        sub={sp.confirmar.sub}
      >
        <ul className="list-disc space-y-1 pl-5 text-tinta-2">
          <li>
            {ligados.length === 1
              ? `Se quita ${ligados[0].proveedor} de ${objeto}.`
              : `Se quitan los ${ligados.length} proveedores ligados a ${objeto}.`}
          </li>
          <li>{sp.confirmar.nota}</li>
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setConfirmar(false)}>
            Cancelar
          </Boton>
          <Boton disabled={pendiente} onClick={() => cambiar(true)}>
            {sp.encender}
          </Boton>
        </div>
      </Dialogo>
    </Bloque>
  );
}
