import { describe, expect, it } from "vitest";
import { describirUsos, totalUsos } from "../usos";

describe("usos de un registro de catálogo", () => {
  it("lo que nunca se usó se puede eliminar", () => {
    const u = { hoteles: 0, actividades: 0, servicios: 0, viajes: 0 };
    expect(totalUsos(u)).toBe(0);
    expect(describirUsos(u)).toBe("no se ha usado");
  });
  it("explica por qué no se puede eliminar", () => {
    expect(describirUsos({ hoteles: 3, actividades: 1, servicios: 0, viajes: 0 })).toBe(
      "está ligado a 3 hoteles y 1 actividad",
    );
    expect(describirUsos({ hoteles: 0, actividades: 0, servicios: 2, viajes: 4 })).toBe(
      "está ligado a 2 servicios y se usó en 4 viajes",
    );
  });
});
