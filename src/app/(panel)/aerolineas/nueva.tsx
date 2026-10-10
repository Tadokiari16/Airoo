"use client";

import { useMemo, useState, useTransition } from "react";
import { buscarIata, limpiarIata, type AerolineaIata } from "@/lib/aerolineas";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { agregarAerolinea } from "./acciones";
import type { Aerolinea } from "./datos";
import { Codigo } from "./lista";

/** Agregar desde la lista IATA, buscando por código o nombre. Si no está, a mano. */
export function NuevaAerolinea({
  abierto,
  iata,
  enCatalogo,
  alCerrar,
  alAgregar,
}: {
  abierto: boolean;
  iata: AerolineaIata[];
  enCatalogo: Pick<Aerolinea, "iata" | "nombre" | "archivado">[];
  alCerrar: () => void;
  alAgregar: (id: string, nombre: string) => void;
}) {
  const [vez, setVez] = useState(0);
  const cerrar = () => {
    setVez((v) => v + 1);
    alCerrar();
  };
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Nueva aerolínea"
      sub="Se busca en la lista IATA; el nombre y el código se llenan solos."
      ancho={520}
    >
      <Formulario
        key={vez}
        iata={iata}
        enCatalogo={enCatalogo}
        alCancelar={cerrar}
        alAgregar={(id, nombre) => {
          setVez((v) => v + 1);
          alAgregar(id, nombre);
        }}
      />
    </Dialogo>
  );
}

function Formulario({
  iata,
  enCatalogo,
  alCancelar,
  alAgregar,
}: {
  iata: AerolineaIata[];
  enCatalogo: Pick<Aerolinea, "iata" | "nombre" | "archivado">[];
  alCancelar: () => void;
  alAgregar: (id: string, nombre: string) => void;
}) {
  const [q, setQ] = useState("");
  const [elegida, setElegida] = useState<AerolineaIata | null>(null);
  const [aMano, setAMano] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const resultados = useMemo(() => buscarIata(iata, q), [iata, q]);
  const ya = (c: string) => enCatalogo.find((a) => a.iata === c);

  const agregar = () =>
    iniciar(async () => {
      const c = aMano ? codigo : (elegida?.iata ?? "");
      const r = await agregarAerolinea(c, aMano ? nombre : "");
      if ("error" in r) return setError(r.error);
      alAgregar(r.id, aMano ? nombre.trim() : elegida!.nombre);
    });

  if (aMano)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13.5px] text-tinta-2">
          Para una aerolínea nueva o que no aparece en la lista. El código es el de dos caracteres que viene
          en el boleto (VB, Y4, AM).
        </p>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Campo
            etiqueta="Código IATA"
            id="aerolinea-iata"
            value={codigo}
            maxLength={2}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            autoComplete="off"
          />
          <Campo
            etiqueta="Nombre"
            id="aerolinea-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
          />
        </div>
        {error ? (
          <p role="alert" className="text-[13px] text-rojo">
            {error}
          </p>
        ) : null}
        <div className="flex justify-between gap-2">
          <Boton variante="texto" onClick={() => (setAMano(false), setError(null))}>
            Buscar en la lista
          </Boton>
          <div className="flex gap-2">
            <Boton variante="secundario" className="h-10" onClick={alCancelar}>
              Cancelar
            </Boton>
            <Boton onClick={agregar} disabled={pendiente || !limpiarIata(codigo) || nombre.trim().length < 2}>
              Agregar aerolínea
            </Boton>
          </div>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <Campo
        etiqueta="Código o nombre"
        id="aerolinea-buscar"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setElegida(null);
          setError(null);
        }}
        placeholder="Ej. VB o Viva"
        autoFocus
        autoComplete="off"
      />
      {q.trim() ? (
        resultados.length ? (
          <ul role="listbox" aria-label="Aerolíneas de la lista IATA" className="flex flex-col">
            {resultados.map((r) => {
              const existe = ya(r.iata);
              const on = elegida?.iata === r.iata;
              return (
                <li key={r.iata}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={!!existe}
                    onClick={() => setElegida(r)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-left disabled:cursor-default ${on ? "bg-azul-tenue shadow-[inset_0_0_0_1.5px_var(--color-azul)]" : "hover:bg-suave"}`}
                  >
                    <Codigo iata={r.iata} />
                    <span className="min-w-0 flex-1">
                      <b
                        className={`block truncate text-[14px] font-semibold ${existe ? "text-tinta-3" : ""}`}
                      >
                        {r.nombre}
                      </b>
                      <span className="block truncate text-[12.5px] text-tinta-3">
                        {existe
                          ? existe.archivado
                            ? "Ya está en el catálogo, archivada"
                            : "Ya está en el catálogo"
                          : [`Código ${r.iata}`, r.pais].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13.5px] text-tinta-2">
            Ninguna aerolínea de la lista coincide con «{q.trim()}».
          </p>
        )
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] text-rojo">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Boton
          variante="texto"
          onClick={() => {
            setAMano(true);
            setError(null);
            const c = limpiarIata(q);
            if (c) setCodigo(c);
            else setNombre(q.trim());
          }}
        >
          No está en la lista
        </Boton>
        <div className="flex gap-2">
          <Boton variante="secundario" className="h-10" onClick={alCancelar}>
            Cancelar
          </Boton>
          <Boton onClick={agregar} disabled={pendiente || !elegida}>
            Agregar aerolínea
          </Boton>
        </div>
      </div>
    </div>
  );
}
