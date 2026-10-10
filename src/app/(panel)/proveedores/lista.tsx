"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { Boton } from "@/components/ui/boton";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { AvisoFlotante } from "@/components/ui/aviso-flotante";
import { IconoAerolineas, IconoMas } from "@/components/iconos";
import {
  BuscadorLista,
  Celda,
  FilaCatalogo,
  Pestanas,
  SinResultados,
  Tabla,
} from "@/components/catalogo/lista";
import { Encabezado } from "../encabezado";
import type { Proveedor } from "./datos";
import { cuentaCorta, desde, nombreParaQue, subtitulo, type Permisos } from "./textos";
import { PanelProveedor } from "./panel";
import { FormularioProveedor } from "./formulario";

type Filtro = "todos" | "plataforma" | "directo" | "archivados";

export function ListaProveedores({
  proveedores,
  inicial,
  permisos,
}: {
  proveedores: Proveedor[];
  inicial: string | null;
  permisos: Permisos;
}) {
  const [filtro, setFiltro] = useState<Filtro>(() =>
    proveedores.find((p) => p.id === inicial)?.archivado ? "archivados" : "todos",
  );
  const [texto, setTexto] = useState("");
  const [sel, setSel] = useState<string | null>(inicial);
  const [formulario, setFormulario] = useState<null | { editar?: Proveedor }>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const pasa = useCallback(
    (p: Proveedor, f: Filtro) =>
      f === "archivados" ? p.archivado : !p.archivado && (f === "todos" || p.tipo === f),
    [],
  );
  const filas = useMemo(() => {
    const q = normalizar(texto);
    return proveedores.filter((p) => pasa(p, filtro) && (!q || p.busqueda.includes(q)));
  }, [proveedores, filtro, texto, pasa]);

  const elegido = proveedores.find((p) => p.id === sel) ?? null;
  const pos = filas.findIndex((p) => p.id === sel);

  // La liga lleva el proveedor abierto (?p=…) para poder compartirla.
  useEffect(() => {
    const url = new URL(window.location.href);
    // Al abrir una ficha la lista puede volver a pintarse; la URL ya es de la ficha.
    if (url.pathname !== "/proveedores") return;
    if (sel) url.searchParams.set("p", sel);
    else url.searchParams.delete("p");
    window.history.replaceState(null, "", url);
  }, [sel]);

  const mover = useCallback(
    (paso: 1 | -1) => {
      if (pos < 0) return;
      const sig = filas[Math.max(0, Math.min(filas.length - 1, pos + paso))];
      if (sig) setSel(sig.id);
    },
    [filas, pos],
  );
  const cerrar = useCallback(() => setSel(null), []);

  const cuenta = (f: Filtro) => proveedores.filter((p) => pasa(p, f)).length;

  return (
    <>
      <Encabezado
        titulo="Proveedores"
        acciones={
          permisos.editar ? (
            <Boton onClick={() => setFormulario({})}>
              <IconoMas tam={16} /> Nuevo proveedor
            </Boton>
          ) : null
        }
      >
        Con quién reservas, a quién llamar y dónde recibe cada uno. Lo que se acuerda en cada reserva, y lo
        pendiente de pago, vive en el viaje y en Finanzas.
      </Encabezado>

      <Tarjeta>
        {proveedores.length === 0 ? (
          <Vacio titulo="Todavía no hay proveedores">
            Plataformas y proveedores directos, con sus contactos y las cuentas donde reciben.
          </Vacio>
        ) : (
          <>
            <Pestanas
              etiqueta="Tipo de proveedor"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: "todos", etiqueta: "Todos", n: cuenta("todos") },
                { valor: "plataforma", etiqueta: "Plataformas", n: cuenta("plataforma") },
                { valor: "directo", etiqueta: "Directos", n: cuenta("directo") },
                {
                  valor: "archivados",
                  etiqueta: "Archivados",
                  n: cuenta("archivados"),
                  oculta: cuenta("archivados") === 0,
                },
              ]}
            />
            <BuscadorLista valor={texto} alCambiar={setTexto} placeholder="Buscar proveedor o contacto" />
            <Tabla
              columnas={[
                { titulo: "Proveedor", ancho: "30%" },
                { titulo: "Cómo se reserva", ancho: "24%" },
                { titulo: "Contacto principal", ancho: "28%" },
                { titulo: "Uso", ancho: "18%" },
              ]}
            >
              {filas.map((p) => {
                const principal = p.contactos[0];
                const pendiente = p.cuentas.some((c) => c.estado === "pendiente");
                const verificadas = p.cuentas.filter((c) => c.estado === "verificada");
                return (
                  <FilaCatalogo
                    key={p.id}
                    etiqueta={p.nombre}
                    seleccionada={p.id === sel}
                    alAbrir={() => setSel(p.id)}
                  >
                    <Celda primera titulo={p.nombre} sub={subtitulo(p) || "Sin categoría"} />
                    {p.tipo === "plataforma" ? (
                      <Celda titulo="En su plataforma" sub={p.sitio} />
                    ) : (
                      <Celda
                        titulo="Directo"
                        sub={
                          pendiente
                            ? "Cuenta por verificar"
                            : verificadas.length
                              ? verificadas.map(cuentaCorta).join(" · ")
                              : "Sin cuentas guardadas"
                        }
                        tonoSub={pendiente ? "ambar" : undefined}
                      />
                    )}
                    {principal ? (
                      <Celda
                        titulo={`${principal.nombre} · ${nombreParaQue(principal.paraQue)}`}
                        sub={principal.whatsapp ?? principal.correo}
                      />
                    ) : (
                      <Celda titulo="Sin contacto" sub="Se agrega desde su ficha" tonoSub="ambar" />
                    )}
                    <Celda
                      titulo={p.usos.viajes ? `${p.usos.viajes} viajes` : "Sin viajes todavía"}
                      sub={desde(p)}
                    />
                  </FilaCatalogo>
                );
              })}
            </Tabla>
            {filas.length === 0 ? (
              <SinResultados>
                {texto
                  ? `Ningún proveedor o contacto coincide con «${texto}».`
                  : filtro === "archivados"
                    ? "No hay proveedores archivados."
                    : "No hay proveedores de este tipo."}
              </SinResultados>
            ) : null}
          </>
        )}
        <div className="flex gap-2.5 border-t border-linea px-5 py-3.5 text-[13px] text-tinta-2">
          <IconoAerolineas tam={17} className="mt-0.5 shrink-0 text-tinta-3" />
          <p>
            <b className="font-semibold text-tinta">Las aerolíneas no se registran aquí.</b> Se compran en su
            sitio como cualquier pasajero, sin cuenta ni acuerdo; cómo se compra, equipaje y check-in están en
            Catálogo › Aerolíneas. Si algún día compras vuelos con un consolidador, ese sí se registra aquí
            como plataforma.
          </p>
        </div>
      </Tarjeta>

      <PanelProveedor
        proveedor={elegido}
        posicion={pos >= 0 ? { actual: pos + 1, total: filas.length } : undefined}
        alMover={mover}
        alCerrar={cerrar}
        alEditar={(p) => setFormulario({ editar: p })}
        alAvisar={setAviso}
        alArchivar={(archivado) => {
          // Al archivar o reactivar, la lista cambia de pestaña con él.
          if (archivado) setFiltro("archivados");
          else setFiltro("todos");
        }}
        alEliminar={() => setSel(null)}
        permisos={permisos}
      />

      <FormularioProveedor
        abierto={formulario !== null}
        editar={formulario?.editar ?? null}
        permisos={permisos}
        alCerrar={() => setFormulario(null)}
        alGuardar={(id, mensaje) => {
          setFormulario(null);
          setAviso(mensaje);
          setTexto("");
          if (filtro === "archivados") setFiltro("todos");
          setSel(id);
        }}
      />
      <AvisoFlotante texto={aviso} alCerrar={() => setAviso(null)} />
    </>
  );
}
