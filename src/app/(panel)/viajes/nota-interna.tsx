"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { guardarNotaInterna } from "./acciones";

const CAMPO =
  "min-h-[64px] w-full resize-y rounded-campo bg-tarjeta px-3 py-2 text-[13.5px] shadow-borde outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-azul)]";

/**
 * Nota nueva para el equipo. Es un área de texto: Enter agrega una línea y no envía nada.
 * Se guarda con el botón o al salir del campo, y el texto solo se vacía si se guardó.
 */
export function NotaNueva({ viajeId, alAvisar }: { viajeId: string; alAvisar: (t: string) => void }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"" | "guardando" | "guardado" | string>("");
  const [, iniciar] = useTransition();
  const ocupado = useRef(false);
  const reloj = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reloj.current), []);

  const puedeGuardar = texto.trim().length >= 2;
  function guardar() {
    if (!puedeGuardar || ocupado.current) return;
    ocupado.current = true;
    setEstado("guardando");
    iniciar(async () => {
      const r = await guardarNotaInterna(viajeId, texto);
      ocupado.current = false;
      if (r.error) {
        setEstado(r.error);
        return;
      }
      setTexto("");
      setEstado("guardado");
      alAvisar("Nota interna guardada · no se le avisa al cliente");
      reloj.current = setTimeout(() => setEstado(""), 3000);
    });
  }

  return (
    <div className="mb-3 flex flex-col gap-2">
      <textarea
        aria-label="Nota interna para el equipo"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setEstado("");
        }}
        onBlur={guardar}
        maxLength={1000}
        placeholder="Nota interna para el equipo…"
        className={CAMPO}
      />
      <div className="flex items-center justify-between gap-2">
        <p
          role="status"
          className={`text-[12.5px] ${estado && estado !== "guardado" && estado !== "guardando" ? "text-rojo" : "text-tinta-3"}`}
        >
          {estado === "guardando"
            ? "Guardando…"
            : estado === "guardado"
              ? "Guardado"
              : estado || (puedeGuardar ? "Sin guardar" : "")}
        </p>
        <Boton
          variante="secundario"
          className="h-9"
          disabled={!puedeGuardar || estado === "guardando"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={guardar}
        >
          Guardar nota
        </Boton>
      </div>
    </div>
  );
}

/** Una nota ya guardada: se edita en el lugar y se elimina con confirmación. */
export function NotaGuardada({
  id,
  texto,
  alCambiar,
  alEliminar,
}: {
  id: string;
  texto: string;
  alCambiar: (id: string, texto: string) => Promise<{ error?: string }>;
  alEliminar: (id: string) => Promise<{ error?: string }>;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(texto);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      const r = await alCambiar(id, borrador);
      if (r.error) setError(r.error);
      else {
        setError("");
        setEditando(false);
      }
    });
  }
  function eliminar() {
    iniciar(async () => {
      const r = await alEliminar(id);
      if (r.error) setError(r.error);
    });
  }

  if (editando)
    return (
      <div className="mt-1 flex flex-col gap-2">
        <textarea
          aria-label="Editar nota"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          maxLength={1000}
          className={CAMPO}
        />
        {error ? (
          <p role="alert" className="text-[12.5px] text-rojo">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Boton className="h-8" disabled={pendiente || borrador.trim().length < 2} onClick={guardar}>
            Guardar cambios
          </Boton>
          <Boton
            variante="secundario"
            className="h-8"
            onClick={() => {
              setEditando(false);
              setBorrador(texto);
              setError("");
            }}
          >
            Cancelar
          </Boton>
        </div>
      </div>
    );

  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px]">
      {confirmando ? (
        <>
          <span className="text-tinta-2">¿Eliminar esta nota?</span>
          <button type="button" className="font-semibold text-rojo hover:underline" disabled={pendiente} onClick={eliminar}>
            Eliminar
          </button>
          <button type="button" className="font-semibold text-azul-oscuro hover:underline" onClick={() => setConfirmando(false)}>
            Conservar
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="font-semibold text-azul-oscuro hover:underline"
            onClick={() => {
              setBorrador(texto);
              setEditando(true);
            }}
          >
            Editar nota
          </button>
          <button type="button" className="font-semibold text-azul-oscuro hover:underline" onClick={() => setConfirmando(true)}>
            Eliminar nota
          </button>
        </>
      )}
      {error ? (
        <span role="alert" className="text-rojo">
          {error}
        </span>
      ) : null}
    </span>
  );
}
