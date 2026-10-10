import { describe, expect, it } from "vitest";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";

// Ningún catálogo guarda precios: se capturan a mano en el armador. La única
// excepción con monto son los cargos que se pagan en el hotel, con su moneda.
const PERMITIDAS = new Set(["hotel_cargos"]);
// Tablas fuera de los catálogos que sí llevan dinero (viajes, cobros, pagos).
// Llegan desde la Fase 2; cada una se agrega aquí a propósito.
const FUERA_DE_CATALOGOS = new Set<string>([]);

const PARECE_DINERO = /precio|monto|costo|importe|centavos|tarifa_neta|neto|venta|utilidad|comision/;

// Las columnas se nombran en camelCase y la base las guarda en snake_case.
const snake = (n: string) => n.replace(/[A-Z]/g, (l) => "_" + l.toLowerCase());
const tablas = (Object.values(schema) as unknown[])
  .filter((x): x is PgTable => x instanceof PgTable)
  .map((t) => getTableConfig(t))
  .map((t) => ({ name: t.name, columns: t.columns.map((c) => ({ name: snake(c.name) })) }));

describe("el esquema no guarda precios en los catálogos", () => {
  it("encuentra las tablas", () => {
    expect(tablas.map((t) => t.name)).toEqual(
      expect.arrayContaining(["hoteles", "hotel_cargos", "actividades"]),
    );
  });

  it("solo hotel_cargos tiene columnas de dinero", () => {
    const conDinero = tablas.flatMap((t) =>
      t.columns.filter((c) => PARECE_DINERO.test(c.name)).map((c) => `${t.name}.${c.name}`),
    );
    const fuera = conDinero.filter((c) => {
      const tabla = c.split(".")[0];
      return !PERMITIDAS.has(tabla) && !FUERA_DE_CATALOGOS.has(tabla);
    });
    expect(fuera).toEqual([]);
    expect(conDinero).toContain("hotel_cargos.monto_centavos");
  });

  it("cada monto de hotel_cargos lleva su moneda", () => {
    const cargos = tablas.find((t) => t.name === "hotel_cargos")!;
    expect(cargos.columns.map((c) => c.name)).toContain("moneda");
  });
});
