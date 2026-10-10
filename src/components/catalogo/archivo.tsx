"use client";

// Archivar y eliminar en todos los catálogos: archivar siempre se puede y se
// deshace; eliminar solo si el registro nunca se usó.

import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";

export type Confirmacion = "archivar" | "eliminar" | null;

export function ConfirmarArchivo({
  confirmacion,
  nombre,
  alCerrar,
  alArchivar,
  alEliminar,
  archivar,
  eliminar,
}: {
  confirmacion: Confirmacion;
  nombre: string;
  alCerrar: () => void;
  alArchivar: (motivo: string) => void;
  alEliminar: () => void;
  /** Qué pasa al archivar, en frases cortas. */
  archivar: string[];
  /** Por qué se puede eliminar, o por qué no. */
  eliminar: { permitido: boolean; texto: string };
}) {
  const [motivo, setMotivo] = useState("");
  const esEliminar = confirmacion === "eliminar";
  return (
    <Dialogo
      abierto={confirmacion !== null}
      alCerrar={alCerrar}
      titulo={esEliminar ? `¿Eliminar ${nombre}?` : `¿Archivar ${nombre}?`}
    >
      {esEliminar ? (
        <p className="text-tinta-2">{eliminar.texto}</p>
      ) : (
        <>
          <ul className="list-disc space-y-1 pl-5 text-tinta-2">
            {archivar.map((t) => (
              <li key={t}>{t}</li>
            ))}
            <li>Se puede reactivar en cualquier momento.</li>
          </ul>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">
              Motivo <span className="font-medium text-tinta-3">· opcional</span>
            </span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Ya no trabajamos con ellos"
              className="h-10 rounded-campo bg-tarjeta px-3 text-sm shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]"
            />
          </label>
        </>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar}>
          {esEliminar && !eliminar.permitido ? "Entendido" : "Cancelar"}
        </Boton>
        {esEliminar ? (
          eliminar.permitido ? (
            <Boton variante="peligro" onClick={alEliminar}>
              Eliminar
            </Boton>
          ) : null
        ) : (
          <Boton onClick={() => alArchivar(motivo)}>Archivar</Boton>
        )}
      </div>
    </Dialogo>
  );
}
