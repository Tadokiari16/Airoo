"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ligaWhatsApp } from "@/lib/whatsapp";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Insignia } from "@/components/ui/insignia";
import { IconoMas, IconoWhatsapp } from "@/components/iconos";
import { Bloque } from "@/components/catalogo/bloque";
import { FormularioProveedor } from "../../proveedores/formulario";
import type { Permisos as PermisosProveedor } from "../../proveedores/textos";
import type { Actividad, OpcionProveedor } from "../datos";
import { guardarIdLiga, ligarProveedor, pagaEnLugar, quitarLiga } from "../acciones";

const LIGA =
  "inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline";

/**
 * Proveedores ligados. Se guardan al momento, como las fotos: no esperan a
 * «Guardar» de la ficha.
 */
export function DondeReservar({
  actividad: a,
  proveedores,
  editable,
  permisosProveedor,
  alAvisar,
}: {
  actividad: Actividad;
  proveedores: OpcionProveedor[];
  editable: boolean;
  permisosProveedor: PermisosProveedor;
  alAvisar: (t: string) => void;
}) {
  const [eligiendo, setEligiendo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [confirmarLugar, setConfirmarLugar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const libres = proveedores.filter((p) => !a.ligados.some((l) => l.proveedorId === p.id));

  const correr = (f: () => Promise<{ error?: string; mensaje?: string }>, ok = "") =>
    iniciar(async () => {
      const r = await f();
      const t = r.error ?? r.mensaje ?? ok;
      if (t) alAvisar(t);
    });
  const enLugar = (si: boolean) =>
    correr(
      async () => {
        const r = await pagaEnLugar(a.id, si);
        setConfirmarLugar(false);
        return r;
      },
      si ? "Lo paga el cliente en el lugar · no genera pagos de Airoo" : "Se reserva con un proveedor",
    );

  return (
    <Bloque
      id="reservar"
      titulo="Dónde se puede reservar"
      soloEquipo
      descripcion="Se liga a proveedores de Proveedores; sus datos se consultan desde ahí, no se copian. No obliga a reservar en ninguno: el proveedor, la moneda, el pago y la cancelación de cada reserva se eligen en el armador."
    >
      {a.ligados.length ? (
        <ul className="border-t border-linea">
          {a.ligados.map((l) => {
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
                      onClick={() => correr(() => quitarLiga(l.id))}
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
                        correr(() => guardarIdLiga(l.id, e.target.value), "ID guardado");
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
        <p className="text-[13.5px] text-tinta-2">
          {a.sePagaEnLugar
            ? "Lo paga el cliente en el lugar: no se liga a ningún proveedor y no genera pagos de Airoo."
            : "Sin proveedor ligado. Se puede ligar uno de Proveedores o crearlo aquí mismo; mientras tanto se cotiza igual."}
        </p>
      )}

      {editable ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {a.sePagaEnLugar ? null : eligiendo ? (
            <select
              autoFocus
              aria-label="Proveedor para ligar"
              defaultValue=""
              disabled={pendiente}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setEligiendo(false);
                correr(() => ligarProveedor(a.id, id));
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
            onClick={() =>
              a.sePagaEnLugar ? enLugar(false) : a.ligados.length ? setConfirmarLugar(true) : enLugar(true)
            }
            className="cursor-pointer text-[13px] font-semibold text-tinta-2 hover:text-tinta hover:underline"
          >
            {a.sePagaEnLugar ? "Se reserva con un proveedor" : "Lo paga el cliente en el lugar"}
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
              const r = await ligarProveedor(a.id, id);
              return r.error ? r : { mensaje: "Proveedor creado y ligado a esta actividad" };
            });
          }}
        />
      </div>

      <Dialogo
        abierto={confirmarLugar}
        alCerrar={() => setConfirmarLugar(false)}
        titulo="¿Lo paga el cliente en el lugar?"
        sub="Va en el itinerario como recomendación; no se reserva con nadie."
      >
        <ul className="list-disc space-y-1 pl-5 text-tinta-2">
          <li>
            {a.ligados.length === 1
              ? `Se quita ${a.ligados[0].proveedor} de esta actividad.`
              : `Se quitan los ${a.ligados.length} proveedores ligados a esta actividad.`}
          </li>
          <li>No genera pagos de Airoo. Los proveedores siguen en Proveedores.</li>
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setConfirmarLugar(false)}>
            Cancelar
          </Boton>
          <Boton disabled={pendiente} onClick={() => enLugar(true)}>
            Lo paga el cliente en el lugar
          </Boton>
        </div>
      </Dialogo>
    </Bloque>
  );
}
