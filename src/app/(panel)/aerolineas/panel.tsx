"use client";

import { useState, useTransition } from "react";
import { RUTAS, textoFuente, textoLlegarAntes, type Fuente, type Ruta } from "@/lib/aerolineas";
import { Boton } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/insignia";
import { IconoBasura, IconoCandado, IconoExterno, IconoMas, IconoPalomita } from "@/components/iconos";
import { Dato, PanelLateral, Seccion } from "@/components/catalogo/panel-lateral";
import { ConfirmarArchivo, type Confirmacion } from "@/components/catalogo/archivo";
import type { Aerolinea } from "./datos";
import { archivarAerolinea, eliminarAerolinea, guardarAerolinea, marcarVerificado } from "./acciones";
import { ARCHIVO, plural, urlSitio, type PermisosAerolinea } from "./textos";
import { Codigo } from "./lista";

const BOTON_LIGA =
  "inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold shadow-borde hover:bg-suave";
const ENTRADA =
  "h-9 w-full min-w-0 rounded-[10px] bg-tarjeta px-2.5 text-[13.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)] placeholder:text-tinta-3";
const TH = "pb-1 text-left text-[11px] font-bold tracking-[0.05em] text-tinta-3 uppercase";

const SOLO_EQUIPO = (
  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-tinta-3">
    <IconoCandado tam={12} /> Solo el equipo
  </span>
);

type TarifaEditable = { clave: string; nombre: string; mano: string; documentada: string; cambios: string };
type VentanaEditable = { ruta: Ruta; abre: string; cierra: string; fuente: Fuente; fuenteTexto: string };

/** Las aerolíneas se consultan y se editan aquí mismo; no tienen ficha aparte. */
export function PanelAerolinea({
  aerolinea: a,
  posicion,
  llegarAntes,
  alMover,
  alCerrar,
  alAvisar,
  alArchivar,
  alEliminar,
  permisos,
}: {
  aerolinea: Aerolinea | null;
  posicion?: { actual: number; total: number };
  llegarAntes: { nacional: number; internacional: number };
  alMover: (paso: 1 | -1) => void;
  alCerrar: () => void;
  alAvisar: (t: string) => void;
  alArchivar: (archivada: boolean) => void;
  alEliminar: () => void;
  permisos: PermisosAerolinea;
}) {
  // Al pasar a otra aerolínea se sale de la edición.
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const enEdicion = !!a && editando === a.id;

  const archivar = (motivo: string, si: boolean) =>
    iniciar(async () => {
      if (!a) return;
      const r = await archivarAerolinea(a.id, si, motivo);
      setConfirmar(null);
      alAvisar(
        r.error ??
          (si
            ? `${a.nombre} archivada · ya no aparece al cotizar`
            : `${a.nombre} vuelve a aparecer al cotizar`),
      );
      if (!r.error) alArchivar(si);
    });

  const verificar = (ruta: Ruta) =>
    iniciar(async () => {
      if (!a) return;
      const r = await marcarVerificado(a.id, ruta);
      const t = r.error ?? r.mensaje;
      if (t) alAvisar(t);
    });

  return (
    <PanelLateral
      abierto={!!a}
      alCerrar={alCerrar}
      posicion={posicion}
      alMover={(p) => {
        setEditando(null);
        alMover(p);
      }}
      titulo={a?.nombre ?? ""}
      insignia={
        a ? a.archivado ? <Insignia tono="ambar">Archivada</Insignia> : <Codigo iata={a.iata} grande /> : null
      }
      sub={a ? (a.viajes ? plural(a.viajes, "viaje", "viajes") : "Sin viajes todavía") : null}
      acciones={
        a?.sitio && !enEdicion ? (
          <a href={urlSitio(a.sitio)} target="_blank" rel="noreferrer" className={BOTON_LIGA}>
            <IconoExterno tam={14} /> Abrir sitio de {a.nombre}
          </a>
        ) : null
      }
      pie={
        a ? (
          enEdicion ? (
            <>
              <Boton
                variante="secundario"
                className="h-10"
                onClick={() => {
                  setEditando(null);
                  setError(null);
                }}
              >
                Cancelar
              </Boton>
              <Boton
                key="guardar"
                type="submit"
                form="editar-aerolinea"
                className="h-10 flex-1"
                disabled={pendiente}
              >
                Guardar
              </Boton>
            </>
          ) : (
            <>
              {permisos.archivar ? (
                <Boton
                  variante="secundario"
                  className="h-10"
                  disabled={pendiente}
                  onClick={() => setConfirmar(a.archivado ? "reactivar" : "archivar")}
                >
                  {a.archivado ? "Reactivar" : "Archivar"}
                </Boton>
              ) : null}
              {permisos.editar ? (
                // Otra llave que «Guardar»: si React reusara el botón, el mismo clic enviaría el formulario.
                <Boton key="editar" className="h-10 flex-1" onClick={() => setEditando(a.id)}>
                  Editar
                </Boton>
              ) : null}
            </>
          )
        ) : null
      }
    >
      {a && enEdicion ? (
        <Edicion
          key={a.id}
          aerolinea={a}
          error={error}
          alGuardar={(datos) =>
            iniciar(async () => {
              const r = await guardarAerolinea(a.id, datos);
              if (r.error) return setError(r.error);
              setError(null);
              setEditando(null);
              alAvisar(`${datos.nombre} guardada · las cotizaciones nuevas ya usan estos datos`);
            })
          }
          eliminar={permisos.eliminar ? () => setConfirmar("eliminar") : null}
        />
      ) : a ? (
        <>
          {a.archivado && a.motivoArchivo ? (
            <Seccion titulo="Archivada" tono="ambar">
              <p className="text-[13.5px] text-tinta-2">{a.motivoArchivo}</p>
            </Seccion>
          ) : null}

          <Seccion
            titulo="Tarifas y equipaje"
            extra={<span className="text-azul-oscuro">En la propuesta y en el viaje</span>}
          >
            {a.tarifas.length ? (
              <table className="w-full table-fixed text-[13.5px]">
                <thead>
                  <tr>
                    <th className={`${TH} w-[26%]`}>Tarifa</th>
                    <th className={TH}>Mano</th>
                    <th className={TH}>Documentada</th>
                    <th className={TH}>Cambios</th>
                  </tr>
                </thead>
                <tbody>
                  {a.tarifas.map((t) => (
                    <tr key={t.id} className="border-t border-linea">
                      <td className="py-1.5 pr-2 align-top font-semibold">{t.nombre}</td>
                      <td className="py-1.5 pr-2 align-top text-tinta-2">{t.mano ?? "—"}</td>
                      <td className="py-1.5 pr-2 align-top text-tinta-2">{t.documentada ?? "—"}</td>
                      <td className="py-1.5 align-top text-tinta-2">{t.cambios ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[13.5px] text-tinta-3">Sin tarifas todavía. Se agregan con «Editar».</p>
            )}
            <p className="mt-1.5 text-[12.5px] text-tinta-3">
              Todas incluyen artículo personal. El equipaje se muestra como etiquetas en la tarjeta del vuelo;
              si la tarifa no lo incluye, se dice.
            </p>
          </Seccion>

          <Seccion titulo="Apertura de check-in" accion={SOLO_EQUIPO}>
            <table className="w-full table-fixed text-[13.5px]">
              <thead>
                <tr>
                  <th className={`${TH} w-[36%]`}>Ruta</th>
                  <th className={TH}>Abre</th>
                  <th className={TH}>Cierra</th>
                </tr>
              </thead>
              <tbody>
                {a.checkin.map((v) => (
                  <tr key={v.ruta} aria-label={`Check-in ${v.ruta}`} className="border-t border-linea">
                    <td className="py-1.5 pr-2 align-top">
                      <b className="font-semibold">{RUTAS.find((r) => r.valor === v.ruta)!.nombre}</b>
                      <span className="block text-[12px] text-tinta-3">
                        {v.verificada ? `Verificado por ${v.verificada}` : textoFuente(v)}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 align-top text-tinta-2">{v.abre ?? "Por verificar"}</td>
                    <td className="py-1.5 align-top text-tinta-2">
                      {v.cierra ?? "Por verificar"}
                      {v.verificada ? (
                        <span className="mt-0.5 flex items-center gap-1 text-[12.5px] font-semibold text-verde">
                          <IconoPalomita tam={13} /> Verificado
                        </span>
                      ) : permisos.editar && !a.archivado ? (
                        <button
                          type="button"
                          disabled={pendiente}
                          onClick={() => verificar(v.ruta)}
                          className="mt-0.5 block cursor-pointer text-[13px] font-semibold text-azul-oscuro hover:underline"
                        >
                          Marcar verificado
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1.5 text-[12.5px] text-tinta-3">
              Al cliente se le promete «en cuanto la aerolínea lo abre», no una hora fija. Conviene verificar
              cada ventana con una reserva real antes de confiar en ella.
            </p>
          </Seccion>

          <Seccion titulo="Reglas que no son de la aerolínea">
            <Dato etiqueta="Llegar antes">
              {textoLlegarAntes(llegarAntes)}
              <span className="block text-[12.5px] font-medium text-tinta-3">Regla general del sistema</span>
            </Dato>
            <Dato etiqueta="TUA">
              Ya viene pagada en el boleto
              <span className="block text-[12.5px] font-medium text-tinta-3">
                Se muestra como informativa
              </span>
            </Dato>
          </Seccion>

          <Seccion titulo="Cómo se compra" accion={SOLO_EQUIPO}>
            <Dato etiqueta="Dónde">{a.comoSeCompra ?? "—"}</Dato>
            {a.sitio ? <Dato etiqueta="Sitio">{a.sitio}</Dato> : null}
            <Dato etiqueta="Cuándo">
              En cuanto paga el cliente
              <span className="block text-[12.5px] font-medium text-tinta-3">
                La tarifa puede cambiar en horas
              </span>
            </Dato>
          </Seccion>

          {a.notaInterna ? (
            <Seccion titulo="Nota interna" accion={SOLO_EQUIPO}>
              <p className="text-[13.5px] text-tinta">{a.notaInterna}</p>
            </Seccion>
          ) : null}
        </>
      ) : null}

      {a ? (
        <ConfirmarArchivo
          confirmacion={confirmar}
          nombre={a.nombre}
          objeto="aerolínea"
          alCerrar={() => setConfirmar(null)}
          alArchivar={(m) => archivar(m, true)}
          alReactivar={() => archivar("", false)}
          alEliminar={() =>
            iniciar(async () => {
              const r = await eliminarAerolinea(a.id);
              setConfirmar(null);
              if (r.error) return alAvisar(r.error);
              setEditando(null);
              alAvisar(`${a.nombre} eliminada del catálogo`);
              alEliminar();
            })
          }
          archivar={ARCHIVO.archivar}
          reactivar={ARCHIVO.reactivar}
          eliminar={
            a.viajes
              ? {
                  permitido: false,
                  texto: `Se usó en ${plural(a.viajes, "viaje", "viajes")}, así que no se puede eliminar. Se puede archivar.`,
                }
              : {
                  permitido: true,
                  texto:
                    "Todavía no se usa en ningún viaje. Se borra con sus tarifas y su check-in, y no se puede deshacer. Sigue en la lista IATA para agregarla otra vez.",
                }
          }
        />
      ) : null}
    </PanelLateral>
  );
}

function Edicion({
  aerolinea: a,
  error,
  alGuardar,
  eliminar,
}: {
  aerolinea: Aerolinea;
  error: string | null;
  alGuardar: (d: Parameters<typeof guardarAerolinea>[1]) => void;
  eliminar: (() => void) | null;
}) {
  const [nombre, setNombre] = useState(a.nombre);
  const [sitio, setSitio] = useState(a.sitio ?? "");
  const [comoSeCompra, setComoSeCompra] = useState(a.comoSeCompra ?? "");
  const [nota, setNota] = useState(a.notaInterna ?? "");
  const [tarifas, setTarifas] = useState<TarifaEditable[]>(() =>
    a.tarifas.map((t) => ({
      clave: t.id,
      nombre: t.nombre,
      mano: t.mano ?? "",
      documentada: t.documentada ?? "",
      cambios: t.cambios ?? "",
    })),
  );
  const [ventanas, setVentanas] = useState<VentanaEditable[]>(() =>
    a.checkin.map((v) => ({
      ruta: v.ruta,
      abre: v.abre ?? "",
      cierra: v.cierra ?? "",
      fuente: v.fuente,
      fuenteTexto: v.fuenteTexto ?? "",
    })),
  );
  const ponerTarifa = (i: number, x: Partial<TarifaEditable>) =>
    setTarifas(tarifas.map((t, j) => (j === i ? { ...t, ...x } : t)));
  const ponerVentana = (i: number, x: Partial<VentanaEditable>) =>
    setVentanas(ventanas.map((v, j) => (j === i ? { ...v, ...x } : v)));

  return (
    <form
      id="editar-aerolinea"
      aria-label={`Editar ${a.nombre}`}
      onSubmit={(e) => {
        e.preventDefault();
        alGuardar({
          nombre,
          sitio,
          comoSeCompra,
          notaInterna: nota,
          tarifas: tarifas.map((t) => ({
            nombre: t.nombre,
            mano: t.mano,
            documentada: t.documentada,
            cambios: t.cambios,
          })),
          checkin: ventanas,
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      {error ? (
        <p role="alert" className="rounded-xl bg-rojo-tenue px-3.5 py-2.5 text-[13.5px] text-rojo">
          {error}
        </p>
      ) : null}

      <Seccion titulo="Aerolínea">
        <div className="grid grid-cols-[1fr_72px] gap-2">
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={ENTRADA} />
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Código
            <input value={a.iata} disabled className={`${ENTRADA} text-tinta-3`} />
          </label>
        </div>
      </Seccion>

      <Seccion
        titulo="Tarifas y equipaje"
        extra={<span className="text-azul-oscuro">En la propuesta y en el viaje</span>}
      >
        {tarifas.length ? (
          <table className="w-full table-fixed text-[13.5px]">
            <thead>
              <tr>
                <th className={`${TH} w-[23%]`}>Tarifa</th>
                <th className={`${TH} w-[19%]`}>Mano</th>
                <th className={`${TH} w-[25%]`}>Documentada</th>
                <th className={TH}>Cambios</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {tarifas.map((t, i) => {
                const n = t.nombre || `tarifa ${i + 1}`;
                return (
                  <tr key={t.clave}>
                    <td className="py-1 pr-1.5">
                      <input
                        aria-label={`Nombre, tarifa ${i + 1}`}
                        value={t.nombre}
                        onChange={(e) => ponerTarifa(i, { nombre: e.target.value })}
                        placeholder="Ej. Light"
                        className={ENTRADA}
                      />
                    </td>
                    <td className="py-1 pr-1.5">
                      <input
                        aria-label={`Mano, ${n}`}
                        value={t.mano}
                        onChange={(e) => ponerTarifa(i, { mano: e.target.value })}
                        placeholder="—"
                        className={ENTRADA}
                      />
                    </td>
                    <td className="py-1 pr-1.5">
                      <input
                        aria-label={`Documentada, ${n}`}
                        value={t.documentada}
                        onChange={(e) => ponerTarifa(i, { documentada: e.target.value })}
                        placeholder="—"
                        className={ENTRADA}
                      />
                    </td>
                    <td className="py-1 pr-1.5">
                      <input
                        aria-label={`Cambios, ${n}`}
                        value={t.cambios}
                        onChange={(e) => ponerTarifa(i, { cambios: e.target.value })}
                        placeholder="—"
                        className={ENTRADA}
                      />
                    </td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        aria-label={`Quitar ${n}`}
                        onClick={() => setTarifas(tarifas.filter((_, j) => j !== i))}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-tinta-3 hover:bg-suave hover:text-rojo"
                      >
                        <IconoBasura tam={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-[13px] text-tinta-3">Sin tarifas todavía.</p>
        )}
        <button
          type="button"
          onClick={() =>
            setTarifas([
              ...tarifas,
              { clave: crypto.randomUUID(), nombre: "", mano: "", documentada: "", cambios: "" },
            ])
          }
          className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-azul-oscuro hover:underline"
        >
          <IconoMas tam={15} /> Agregar tarifa
        </button>
        <p className="mt-1.5 text-[12.5px] text-tinta-3">
          Equipaje en kilos («10 kg»); vacío si la tarifa no lo incluye. Cambios: «Sin cambios», «Con cargo» o
          «Sin cargo». El artículo personal va en todas.
        </p>
      </Seccion>

      <Seccion titulo="Apertura de check-in" accion={SOLO_EQUIPO}>
        <div className="flex flex-col gap-3">
          {ventanas.map((v, i) => {
            const original = a.checkin[i];
            const ruta = RUTAS.find((r) => r.valor === v.ruta)!.nombre;
            const cambio = v.abre !== (original.abre ?? "") || v.cierra !== (original.cierra ?? "");
            const verificada = original.fuente === "verificado";
            return (
              <fieldset key={v.ruta} className="border-t border-linea pt-2 first:border-t-0 first:pt-0">
                <legend className="text-[13.5px] font-semibold">{ruta}</legend>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    aria-label={`Abre, ${ruta}`}
                    value={v.abre}
                    onChange={(e) => ponerVentana(i, { abre: e.target.value })}
                    placeholder="Abre: 72 h antes"
                    className={ENTRADA}
                  />
                  <input
                    aria-label={`Cierra, ${ruta}`}
                    value={v.cierra}
                    onChange={(e) => ponerVentana(i, { cierra: e.target.value })}
                    placeholder="Cierra: 1 h antes"
                    className={ENTRADA}
                  />
                </div>
                {verificada && !cambio ? (
                  <p className="mt-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-verde">
                    <IconoPalomita tam={13} /> Verificado por {original.verificada}
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      aria-label={`Fuente, ${ruta}`}
                      value={v.fuente === "verificado" ? "terceros" : v.fuente}
                      onChange={(e) => ponerVentana(i, { fuente: e.target.value as Fuente })}
                      className={ENTRADA}
                    >
                      <option value="terceros">Guía de terceros</option>
                      <option value="sin_fuente">Sin fuente todavía</option>
                    </select>
                    {v.fuente !== "sin_fuente" ? (
                      <input
                        aria-label={`Cuál guía, ${ruta}`}
                        value={v.fuenteTexto}
                        onChange={(e) => ponerVentana(i, { fuenteTexto: e.target.value })}
                        placeholder="eSky, ByAir…"
                        className={ENTRADA}
                      />
                    ) : null}
                    {verificada ? (
                      <p className="col-span-2 text-[12.5px] text-ambar">
                        Con otra hora deja de estar verificada; se vuelve a marcar con una reserva real.
                      </p>
                    ) : null}
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
      </Seccion>

      <Seccion titulo="Cómo se compra" accion={SOLO_EQUIPO}>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
          Dónde
          <input value={comoSeCompra} onChange={(e) => setComoSeCompra(e.target.value)} className={ENTRADA} />
        </label>
        <label className="mt-2 flex flex-col gap-1 text-[12.5px] font-semibold">
          Sitio
          <input
            value={sitio}
            onChange={(e) => setSitio(e.target.value)}
            placeholder="vivaaerobus.com"
            className={ENTRADA}
          />
        </label>
      </Seccion>

      <Seccion titulo="Nota interna" accion={SOLO_EQUIPO}>
        <textarea
          aria-label="Nota interna"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          className="w-full rounded-[10px] bg-tarjeta px-2.5 py-2 text-[13.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
        />
      </Seccion>

      {eliminar ? (
        <button
          type="button"
          onClick={eliminar}
          className="self-start cursor-pointer text-[13px] font-semibold text-tinta-2 hover:text-rojo hover:underline"
        >
          Eliminar aerolínea
        </button>
      ) : null}
    </form>
  );
}
