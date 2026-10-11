// Aerolíneas de ejemplo, las del prototipo de Aerolíneas. Las ventanas de
// check-in llevan la fuente del prototipo; ninguna está verificada.

import type { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";

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
  /** [nombre, mano, documentada, cambios] */
  tarifas: [string, string | null, string | null, string][];
  nacional: Ventana;
  internacional: Ventana;
}[] = [
  {
    iata: "VB",
    nombre: "VivaAerobus",
    sitio: "vivaaerobus.com",
    nota: "La tarifa Switch de 72 h no está confirmada en fuente oficial.",
    tarifas: [
      ["Zero", null, null, "Sin cambios"],
      ["Light", "10 kg", null, "Con cargo"],
      ["Switch", null, "15 kg", "Con cargo"],
    ],
    nacional: ["Depende de la tarifa", "1 h 10 min antes", "terceros", "eSky"],
    internacional: ["Depende de la tarifa", "1 h 10 min antes", "terceros", "eSky"],
  },
  {
    iata: "Y4",
    nombre: "Volaris",
    sitio: "volaris.com",
    tarifas: [
      ["Básica", null, null, "Con cargo"],
      ["Clásica", "10 kg", "25 kg", "Con cargo"],
      ["Plus", "10 kg", "25 kg", "Sin cargo"],
    ],
    nacional: ["72 h antes", "1 h antes", "terceros", "ByAir"],
    internacional: ["72 h antes", "1 h antes", "terceros", "ByAir"],
  },
  {
    iata: "AM",
    nombre: "Aeroméxico",
    sitio: "aeromexico.com",
    tarifas: [
      ["Básica", "10 kg", null, "Sin cambios"],
      ["Clásica", "10 kg", "25 kg", "Con cargo"],
      ["Flexible", "10 kg", "25 kg", "Sin cargo"],
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
        comoSeCompra: "En su sitio, con la forma de pago que ofrezca",
        notaInterna: a.nota ?? null,
        creadoPor: duenoId,
      })
      .returning({ id: schema.aerolineas.id });
    await db.insert(schema.aerolineaTarifas).values(
      a.tarifas.map(([nombre, mano, documentada, cambios], orden) => ({
        aerolineaId: nueva.id,
        nombre,
        mano,
        documentada,
        cambios,
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
