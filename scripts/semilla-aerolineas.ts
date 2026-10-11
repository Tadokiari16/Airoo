// Aerolíneas de ejemplo, las del prototipo de Aerolíneas. Las ventanas de
// check-in llevan la fuente del prototipo; ninguna está verificada.

import type { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import type { Cambios } from "../src/lib/aerolineas";

type Db = ReturnType<typeof drizzle<typeof schema>>;

type Ventana = [
  abre: string | null,
  cierra: string | null,
  fuente: "terceros" | "sin_fuente",
  texto: string | null,
];

const AEROLINEAS: {
  iata: string;
  nombre: string;
  sitio: string;
  nota?: string;
  /** [nombre, kg de mano, kg documentado, cambios]; sin kilos no incluye. Una pieza de cada uno. */
  tarifas: [string, number | null, number | null, Cambios][];
  nacional: Ventana;
  internacional: Ventana;
}[] = [
  {
    iata: "VB",
    nombre: "VivaAerobus",
    sitio: "vivaaerobus.com",
    nota: "La tarifa Switch de 72 h no está confirmada en fuente oficial.",
    tarifas: [
      ["Zero", null, null, "sin_cambios"],
      ["Light", 10, null, "con_cargo"],
      ["Switch", null, 15, "con_cargo"],
    ],
    nacional: ["Depende de la tarifa", "1 h 10 min antes", "terceros", "eSky"],
    internacional: ["Depende de la tarifa", "1 h 10 min antes", "terceros", "eSky"],
  },
  {
    iata: "Y4",
    nombre: "Volaris",
    sitio: "volaris.com",
    tarifas: [
      ["Básica", null, null, "con_cargo"],
      ["Clásica", 10, 25, "con_cargo"],
      ["Plus", 10, 25, "sin_cargo"],
    ],
    nacional: ["72 h antes", "1 h antes", "terceros", "ByAir"],
    internacional: ["72 h antes", "1 h antes", "terceros", "ByAir"],
  },
  {
    iata: "AM",
    nombre: "Aeroméxico",
    sitio: "aeromexico.com",
    tarifas: [
      ["Básica", 10, null, "sin_cambios"],
      ["Clásica", 10, 25, "con_cargo"],
      ["Flexible", 10, 25, "sin_cargo"],
    ],
    nacional: [null, null, "sin_fuente", null],
    internacional: [null, null, "sin_fuente", null],
  },
];

export async function sembrarAerolineas(db: Db, duenoId: string) {
  const ya = await db.select({ id: schema.aerolineas.id }).from(schema.aerolineas).limit(1);
  if (ya.length) return;
  for (const a of AEROLINEAS) {
    const [nueva] = await db
      .insert(schema.aerolineas)
      .values({
        iata: a.iata,
        nombre: a.nombre,
        sitio: a.sitio,
        notaInterna: a.nota ?? null,
        creadoPor: duenoId,
      })
      .returning({ id: schema.aerolineas.id });
    await db.insert(schema.aerolineaTarifas).values(
      a.tarifas.map(([nombre, mano, documentado, cambios], orden) => ({
        aerolineaId: nueva.id,
        nombre,
        manoPiezas: mano ? 1 : 0,
        manoKg: mano,
        documentadoPiezas: documentado ? 1 : 0,
        documentadoKg: documentado,
        cambiosRegla: cambios,
        orden,
      })),
    );
    await db.insert(schema.aerolineaCheckin).values(
      (["nacional", "internacional"] as const).map((ruta) => {
        const [abre, cierra, fuente, fuenteTexto] = a[ruta];
        return { aerolineaId: nueva.id, ruta, abre, cierra, fuente, fuenteTexto };
      }),
    );
  }
}
