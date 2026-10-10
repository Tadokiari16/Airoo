"use client";

// Fotos de catálogo: subir (el navegador las reduce antes de enviarlas),
// mostrar la portada con su encuadre 16:9, elegir el encuadre y ordenar la
// galería arrastrando.

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ajustarEncuadre, encuadreInicial, estiloEncuadre, type Encuadre } from "@/lib/fotos";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoSubir } from "@/components/iconos";

export type FotoCatalogo = {
  id: string;
  url: string;
  miniatura: string;
  ancho: number;
  alto: number;
  encuadre: Encuadre | null;
};

const LADO_MAXIMO = 2560;

/**
 * Reduce la foto a 2560 px por lado como máximo y la convierte a JPG, para que
 * la subida sea rápida desde el celular. Si el navegador no la puede leer, se
 * manda tal cual y el servidor responde.
 */
export async function reducirFoto(archivo: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bmp.width, bmp.height));
    if (escala === 1 && archivo.size < 2_500_000 && /jpe?g|webp/.test(archivo.type)) {
      bmp.close();
      return archivo;
    }
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext("2d")!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    bmp.close();
    return await new Promise((ok, mal) =>
      lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("sin blob"))), "image/jpeg", 0.88),
    );
  } catch {
    return archivo;
  }
}

/** Botón que abre el selector de fotos y entrega un FormData listo para subir. */
export function BotonSubir({
  alSubir,
  varias = true,
  className,
  etiqueta,
  children,
}: {
  alSubir: (datos: FormData) => Promise<void> | void;
  varias?: boolean;
  className?: string;
  etiqueta: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={etiqueta}
        disabled={subiendo}
        onClick={() => ref.current?.click()}
        className={className}
      >
        {subiendo ? <span className="text-[12px] font-semibold text-tinta-3">Subiendo…</span> : children}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple={varias}
        hidden
        data-subir={etiqueta}
        onChange={async (e) => {
          const archivos = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (archivos.length === 0) return;
          setSubiendo(true);
          try {
            const datos = new FormData();
            for (const a of archivos) {
              const b = await reducirFoto(a);
              datos.append("fotos", b, a.name.replace(/\.\w+$/, "") + (b === a ? "" : ".jpg"));
            }
            await alSubir(datos);
          } finally {
            setSubiendo(false);
          }
        }}
      />
    </>
  );
}

/** La foto dentro de un marco 16:9, mostrando solo la parte elegida. */
export function MarcoPortada({
  foto,
  className = "",
  chica = false,
  children,
}: {
  foto: FotoCatalogo;
  className?: string;
  chica?: boolean;
  children?: ReactNode;
}) {
  const e = foto.encuadre ?? encuadreInicial(foto.ancho, foto.alto);
  return (
    <div className={`relative aspect-video overflow-hidden bg-gris ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos del bucket, ya optimizadas en webp */}
      <img
        src={chica ? foto.miniatura : foto.url}
        alt=""
        style={estiloEncuadre(e) as CSSProperties}
        draggable={false}
      />
      {children}
    </div>
  );
}

/**
 * Elegir qué parte de la foto se usa como portada: se arrastra el recuadro y
 * se acerca o aleja con el control. Nunca se estira la foto.
 */
export function DialogoEncuadre({
  foto,
  abierto,
  alCerrar,
  alGuardar,
}: {
  foto: FotoCatalogo;
  abierto: boolean;
  alCerrar: () => void;
  alGuardar: (e: Encuadre) => Promise<void>;
}) {
  const inicial = foto.encuadre ?? encuadreInicial(foto.ancho, foto.alto);
  const base = encuadreInicial(foto.ancho, foto.alto);
  const [centro, setCentro] = useState({ x: inicial.x + inicial.ancho / 2, y: inicial.y + inicial.alto / 2 });
  const [escala, setEscala] = useState(Math.round((base.ancho / inicial.ancho) * 100) / 100);
  const [guardando, setGuardando] = useState(false);
  const marco = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const e = ajustarEncuadre(foto, centro, escala);
  const vertical = foto.alto > foto.ancho;

  const pct = (n: number) => `${n * 100}%`;
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Ajustar encuadre"
      sub="El recuadro marca la parte de la foto que se usa en la portada 16:9. Se mueve arrastrándolo."
      ancho={720}
    >
      <div className="flex justify-center rounded-xl bg-tinta/90 p-3">
        <div
          ref={marco}
          className="relative touch-none select-none"
          style={{
            width: vertical ? "auto" : "100%",
            height: vertical ? 420 : "auto",
            aspectRatio: `${foto.ancho} / ${foto.alto}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto completa */}
          <img src={foto.url} alt="" className="absolute inset-0 size-full opacity-45" draggable={false} />
          <div
            role="slider"
            tabIndex={0}
            aria-label="Recuadro de la portada"
            aria-valuenow={Math.round(e.x * 100)}
            aria-valuetext={`${Math.round(e.x * 100)}% desde la izquierda, ${Math.round(e.y * 100)}% desde arriba`}
            className="absolute cursor-move overflow-hidden outline-2 outline-white focus-visible:outline-azul"
            style={{ left: pct(e.x), top: pct(e.y), width: pct(e.ancho), height: pct(e.alto) }}
            onPointerDown={(ev) => {
              (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
              arrastre.current = {
                x: ev.clientX,
                y: ev.clientY,
                cx: e.x + e.ancho / 2,
                cy: e.y + e.alto / 2,
              };
            }}
            onPointerMove={(ev) => {
              const a = arrastre.current;
              const r = marco.current?.getBoundingClientRect();
              if (!a || !r) return;
              setCentro({ x: a.cx + (ev.clientX - a.x) / r.width, y: a.cy + (ev.clientY - a.y) / r.height });
            }}
            onPointerUp={() => {
              arrastre.current = null;
              setCentro({ x: e.x + e.ancho / 2, y: e.y + e.alto / 2 });
            }}
            onKeyDown={(ev) => {
              const paso = 0.02;
              const mov: Record<string, [number, number]> = {
                ArrowLeft: [-paso, 0],
                ArrowRight: [paso, 0],
                ArrowUp: [0, -paso],
                ArrowDown: [0, paso],
              };
              const m = mov[ev.key];
              if (!m) return;
              ev.preventDefault();
              setCentro({ x: e.x + e.ancho / 2 + m[0], y: e.y + e.alto / 2 + m[1] });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- la parte elegida, a color */}
            <img src={foto.url} alt="" draggable={false} style={estiloEncuadre(e) as CSSProperties} />
          </div>
        </div>
      </div>
      <label className="mt-4 flex items-center gap-3 text-[13px] font-semibold">
        Acercar
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={escala}
          onChange={(ev) => setEscala(Number(ev.target.value))}
          className="flex-1 accent-azul"
        />
      </label>
      <div className="mt-5 flex justify-between gap-2">
        <Boton
          variante="secundario"
          onClick={() => {
            setEscala(1);
            setCentro({ x: 0.5, y: 0.5 });
          }}
        >
          Centrar
        </Boton>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            disabled={guardando}
            onClick={async () => {
              setGuardando(true);
              await alGuardar(e);
              setGuardando(false);
            }}
          >
            Guardar encuadre
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}

/** Fotos en cuadrícula que se ordenan arrastrando; cada una con sus acciones. */
export function FotosOrdenables({
  fotos,
  alOrdenar,
  acciones,
  final,
  etiqueta,
  columnas = 6,
  editable,
}: {
  fotos: FotoCatalogo[];
  alOrdenar: (ids: string[]) => void;
  acciones: (f: FotoCatalogo) => ReactNode;
  final?: ReactNode;
  etiqueta: string;
  columnas?: number;
  editable: boolean;
}) {
  const [orden, setOrden] = useState<string[] | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const ids = orden ?? fotos.map((f) => f.id);
  const porId = new Map(fotos.map((f) => [f.id, f]));
  const lista = ids.map((id) => porId.get(id)).filter((f): f is FotoCatalogo => !!f);
  // Si cambian las fotos (se subió o quitó una), se vuelve al orden del servidor.
  const firma = fotos
    .map((f) => f.id)
    .sort()
    .join();
  const [firmaVista, setFirmaVista] = useState(firma);
  if (firma !== firmaVista) {
    setFirmaVista(firma);
    setOrden(null);
  }

  const mover = (de: string, a: string) => {
    if (de === a) return;
    const n = ids.filter((x) => x !== de);
    n.splice(n.indexOf(a) + (ids.indexOf(de) < ids.indexOf(a) ? 1 : 0), 0, de);
    setOrden(n);
  };

  return (
    <ul
      aria-label={etiqueta}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
    >
      {lista.map((f, i) => (
        <li
          key={f.id}
          draggable={editable}
          onDragStart={() => setArrastrando(f.id)}
          onDragOver={(e) => {
            if (!arrastrando) return;
            e.preventDefault();
            mover(arrastrando, f.id);
          }}
          onDragEnd={() => {
            setArrastrando(null);
            if (orden) alOrdenar(orden);
          }}
          aria-label={`Foto ${i + 1} de ${lista.length}`}
          className={`group relative aspect-[4/3] overflow-hidden rounded-[10px] bg-gris ${editable ? "cursor-grab" : ""} ${arrastrando === f.id ? "opacity-40" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura webp del bucket */}
          <img src={f.miniatura} alt="" className="size-full object-cover" draggable={false} />
          {editable ? (
            <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              {acciones(f)}
            </div>
          ) : null}
        </li>
      ))}
      {final ? <li>{final}</li> : null}
    </ul>
  );
}

/** Botoncito sobre una foto («Portada», «Quitar»). */
export function AccionFoto({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md bg-tinta/80 px-1.5 text-[11px] font-semibold text-white hover:bg-tinta"
      {...p}
    >
      {children}
    </button>
  );
}

export function CasillaSubir({
  alSubir,
  etiqueta,
}: {
  alSubir: (d: FormData) => Promise<void> | void;
  etiqueta: string;
}) {
  return (
    <BotonSubir
      alSubir={alSubir}
      etiqueta={etiqueta}
      className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border-[1.5px] border-dashed border-linea text-[12.5px] font-semibold text-tinta-2 hover:border-azul hover:text-azul-oscuro"
    >
      <IconoSubir tam={16} />
      Subir
    </BotonSubir>
  );
}
