import { describe, expect, it } from "vitest";
import { enlaceCliente, enlacePasajero, esTokenValido, generarToken } from "../enlaces";

describe("enlaces del cliente y del pasajero", () => {
  it("el token es largo y solo usa caracteres seguros para una URL", () => {
    const t = generarToken();
    expect(t).toHaveLength(43);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("cada token es distinto (10,000 sin repetirse)", () => {
    const vistos = new Set(Array.from({ length: 10_000 }, generarToken));
    expect(vistos.size).toBe(10_000);
  });

  it("el enlace lleva el token y no el folio", () => {
    const t = generarToken();
    const url = enlaceCliente(t, "https://airoo.mx");
    expect(url).toBe(`https://airoo.mx/c/${t}`);
    expect(url).not.toMatch(/AIR-?\d+/i);
  });

  it("un folio no sirve como token", () => {
    expect(esTokenValido("AIR-2458")).toBe(false);
    expect(esTokenValido("AIR2458")).toBe(false);
    expect(() => enlaceCliente("AIR-2458", "https://airoo.mx")).toThrow();
    expect(() => enlacePasajero("AIR-2458", "https://airoo.mx")).toThrow();
  });
});
