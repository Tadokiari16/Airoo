"use client";

import { useState, useTransition } from "react";
import { evaluarPortada } from "@/lib/fotos";
import { IconoAviso, IconoEncuadre, IconoPalomita, IconoSubir } from "@/components/iconos";
import {
  AccionFoto,
  BotonSubir,
  CasillaSubir,
  DialogoEncuadre,
  FotosOrdenables,
  MarcoPortada,
} from "@/components/catalogo/fotos";
import {
  guardarEncuadre,
  ordenarFotos,
  quitarFoto,
  subirFotos,
  usarComoPortada,
  type DuenoFotos,
} from "@/app/(panel)/fotos-acciones";
import { Bloque } from "./bloque";
import type { FotoCatalogo } from "./fotos";

const BOTON =
  "inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[10px] bg-tarjeta px-3 text-[13px] font-semibold text-tinta shadow-borde hover:bg-suave disabled:cursor-not-allowed disabled:opacity-50";

/** Portada 16:9 y galería ordenable de una ficha (hotel o actividad). */
export function PortadaGaleria({
  dueno,
  portada,
  galeria,
  editable,
  alAvisar,
  descripcion,
  galeriaNota,
  galeriaTitulo = "Galería",
  pie,
}: {
  dueno: DuenoFotos;
  portada: FotoCatalogo | null;
  galeria: FotoCatalogo[];
  editable: boolean;
  alAvisar: (t: string) => void;
  descripcion: string;
  galeriaTitulo?: string;
  /** «albercas, restaurantes, áreas comunes». */
  galeriaNota: string;
  pie: string;
}) {
  const h = { portada, galeria };
  const [encuadre, setEncuadre] = useState(false);
  const [, iniciar] = useTransition();
  const ev = h.portada ? evaluarPortada(h.portada.ancho, h.portada.alto) : null;

  const subir = (destino: "portada" | "galeria") => async (datos: FormData) => {
    const r = await subirFotos(dueno, destino, datos);
    if (r.error) return alAvisar(r.error);
    if (r.portada) {
      const e = evaluarPortada(r.portada.ancho, r.portada.alto);
      alAvisar(e.estado === "lista" ? "Portada lista" : `${e.titulo} · conviene ajustar el encuadre`);
    } else
      alAvisar(r.subidas === 1 ? "Foto agregada a la galería" : `${r.subidas} fotos agregadas a la galería`);
  };
  const correr = (f: () => Promise<{ error?: string }>, ok: string) =>
    iniciar(async () => {
      const r = await f();
      alAvisar(r.error ?? ok);
    });

  return (
    <Bloque id="fotos" titulo="Portada y galería" muestra="En la propuesta" descripcion={descripcion}>
      <div className="grid grid-cols-[1.25fr_1fr] gap-4">
        {h.portada ? (
          <MarcoPortada foto={h.portada} className="rounded-[14px]">
            <span className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-tinta">
              Portada · 16:9
            </span>
          </MarcoPortada>
        ) : editable ? (
          <BotonSubir
            alSubir={subir("portada")}
            varias={false}
            etiqueta="Subir portada"
            className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-linea text-[13px] font-semibold text-tinta-2 hover:border-azul hover:text-azul-oscuro"
          >
            <IconoSubir tam={18} />
            Subir portada
          </BotonSubir>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-[14px] bg-suave text-[13px] text-tinta-3">
            Sin portada
          </div>
        )}
        <div>
          {ev ? (
            <>
              <p
                className={`flex items-center gap-1.5 text-[14px] font-semibold ${ev.estado === "lista" ? "text-tinta" : "text-ambar"}`}
              >
                {ev.estado === "lista" ? (
                  <IconoPalomita tam={15} className="text-verde" />
                ) : (
                  <IconoAviso tam={15} />
                )}
                {ev.titulo}
              </p>
              <p className="mt-0.5 text-[12.5px] text-tinta-2">{ev.detalle}</p>
            </>
          ) : (
            <p className="text-[14px] font-semibold text-ambar">Falta la portada</p>
          )}
          {editable ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {h.portada ? (
                <>
                  <BotonSubir
                    alSubir={subir("portada")}
                    varias={false}
                    etiqueta="Cambiar portada"
                    className={BOTON}
                  >
                    <IconoSubir tam={15} /> Cambiar portada
                  </BotonSubir>
                  <button type="button" className={BOTON} onClick={() => setEncuadre(true)}>
                    <IconoEncuadre tam={15} /> Ajustar encuadre
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          <p className="mt-2.5 text-[12.5px] text-tinta-3">
            Formato horizontal 16:9, de al menos 1600 × 900 px. Si la foto es cuadrada o vertical, se elige
            qué parte se usa; no se estira.
            {h.galeria.length && editable
              ? " También se puede usar una foto de la galería con «Portada»."
              : ""}
          </p>
          {h.portada && editable ? (
            <button
              type="button"
              className="mt-1.5 cursor-pointer text-[12.5px] font-semibold text-tinta-2 hover:text-rojo hover:underline"
              onClick={() => correr(() => quitarFoto(h.portada!.id), "Portada quitada")}
            >
              Quitar portada
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-5 mb-2 text-[13px] font-semibold">
        {galeriaTitulo}{" "}
        <span className="font-medium text-tinta-3">
          · {h.galeria.length} {h.galeria.length === 1 ? "foto" : "fotos"} · {galeriaNota}
        </span>
      </p>
      <FotosOrdenables
        etiqueta={galeriaTitulo}
        fotos={h.galeria}
        editable={editable}
        alOrdenar={(ids) => correr(() => ordenarFotos(ids), "Orden de la galería guardado")}
        acciones={(f) => (
          <>
            <AccionFoto
              aria-label="Usar como portada"
              onClick={() =>
                correr(() => usarComoPortada(f.id), "Portada cambiada · la anterior pasó a la galería")
              }
            >
              Portada
            </AccionFoto>
            <AccionFoto
              aria-label="Quitar foto"
              onClick={() => correr(() => quitarFoto(f.id), "Foto quitada")}
            >
              Quitar
            </AccionFoto>
          </>
        )}
        final={
          editable ? <CasillaSubir alSubir={subir("galeria")} etiqueta="Subir fotos a la galería" /> : null
        }
      />
      <p className="mt-2.5 text-[12.5px] text-tinta-3">{pie}</p>

      {h.portada ? (
        <DialogoEncuadre
          key={h.portada.id + JSON.stringify(h.portada.encuadre)}
          foto={h.portada}
          abierto={encuadre}
          alCerrar={() => setEncuadre(false)}
          alGuardar={async (e) => {
            const r = await guardarEncuadre(h.portada!.id, e);
            alAvisar(r.error ?? "Encuadre guardado");
            if (!r.error) setEncuadre(false);
          }}
        />
      ) : null}
    </Bloque>
  );
}
