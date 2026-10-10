// Reglas de las fotos de catálogo: la portada va en formato fijo 16:9 y se
// elige qué parte de la foto se usa (encuadre), sin estirarla.

export const PORTADA_MIN = { ancho: 1600, alto: 900 } as const;
const PROPORCION = 16 / 9;

/** Recorte en fracciones de la foto (0 a 1): x, y, ancho y alto. */
export type Encuadre = { x: number; y: number; ancho: number; alto: number };

export type EvaluacionPortada = {
  estado: "lista" | "chica" | "cuadrada" | "vertical";
  titulo: string;
  detalle: string;
};

const px = (n: number) => String(n);

/**
 * Cómo queda una foto como portada. Las cuadradas y verticales se recortan;
 * las que miden menos de 1600 px de ancho se ven pixeleadas en pantallas grandes.
 */
export function evaluarPortada(ancho: number, alto: number): EvaluacionPortada {
  const medida = `${px(ancho)} × ${px(alto)}`;
  const r = ancho / alto;
  const chica = ancho < PORTADA_MIN.ancho || alto < PORTADA_MIN.alto;
  const pixeleada = `Con ${px(ancho)} px de ancho se ve pixeleada en pantallas grandes; conviene una horizontal de al menos ${px(PORTADA_MIN.ancho)} px.`;
  // Recortada a 16:9, ¿cuánto queda de ancho útil?
  const recorteChico = Math.min(ancho, alto * PROPORCION) < PORTADA_MIN.ancho;
  if (r < 1.2) {
    const forma = r < 0.95 ? "vertical" : "cuadrada";
    return {
      estado: forma,
      titulo: `La foto es ${forma} (${medida})`,
      detalle: "Para 16:9 se usa solo la franja marcada." + (recorteChico ? " " + pixeleada : ""),
    };
  }
  if (chica) {
    return {
      estado: "chica",
      titulo: `La foto es chica (${medida})`,
      detalle: `Con ${px(ancho)} px de ancho se ve pixeleada en pantallas grandes; conviene una de al menos ${px(PORTADA_MIN.ancho)} × ${px(PORTADA_MIN.alto)} px.`,
    };
  }
  return {
    estado: "lista",
    titulo: "Portada lista",
    detalle: `${medida} px · se ve nítida en celular y computadora.`,
  };
}

/** El recorte 16:9 más grande posible, centrado. */
export function encuadreInicial(ancho: number, alto: number): Encuadre {
  if (ancho / alto >= PROPORCION) {
    const a = (alto * PROPORCION) / ancho;
    return redondear({ x: (1 - a) / 2, y: 0, ancho: a, alto: 1 });
  }
  const h = ancho / PROPORCION / alto;
  return redondear({ x: 0, y: (1 - h) / 2, ancho: 1, alto: h });
}

/**
 * Mueve y cambia de tamaño el recorte sin salirse de la foto y sin perder la
 * proporción 16:9. `escala` va de 1 (el más grande posible) a 3.
 */
export function ajustarEncuadre(
  foto: { ancho: number; alto: number },
  centro: { x: number; y: number },
  escala: number,
): Encuadre {
  const base = encuadreInicial(foto.ancho, foto.alto);
  const e = Math.min(3, Math.max(1, escala));
  const ancho = base.ancho / e;
  const alto = base.alto / e;
  const x = Math.min(1 - ancho, Math.max(0, centro.x - ancho / 2));
  const y = Math.min(1 - alto, Math.max(0, centro.y - alto / 2));
  return redondear({ x, y, ancho, alto });
}

/** Encuadre válido o null: lo que llega del navegador no se toma a ciegas. */
export function encuadreValido(v: unknown): Encuadre | null {
  if (!v || typeof v !== "object") return null;
  const { x, y, ancho, alto } = v as Record<string, unknown>;
  const n = [x, y, ancho, alto];
  if (!n.every((k) => typeof k === "number" && Number.isFinite(k))) return null;
  const e = { x, y, ancho, alto } as Encuadre;
  if (e.ancho <= 0 || e.alto <= 0 || e.x < 0 || e.y < 0) return null;
  if (e.x + e.ancho > 1.001 || e.y + e.alto > 1.001) return null;
  return redondear(e);
}

/**
 * Estilo de la imagen dentro de un marco 16:9 para mostrar solo el recorte.
 * El marco lleva `position: relative; overflow: hidden`.
 */
export function estiloEncuadre(e: Encuadre | null) {
  if (!e)
    return { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } as const;
  const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;
  return {
    position: "absolute",
    maxWidth: "none",
    width: pct(1 / e.ancho),
    height: pct(1 / e.alto),
    left: pct(-e.x / e.ancho),
    top: pct(-e.y / e.alto),
  } as const;
}

function redondear(e: Encuadre): Encuadre {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return { x: r(e.x), y: r(e.y), ancho: r(e.ancho), alto: r(e.alto) };
}
