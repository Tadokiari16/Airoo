import { describe, expect, it } from "vitest";
import { iniciales, limpiar, normalizar } from "../texto";

describe("texto", () => {
  it("normaliza acentos, mayúsculas y espacios", () =>
    expect(normalizar("  San  Cristóbal de las Casas ")).toBe("san cristobal de las casas"));
  it("ñ se compara sin tilde", () => expect(normalizar("Señor")).toBe("senor"));
  it("limpiar conserva acentos", () => expect(limpiar("  Cancún  ")).toBe("Cancún"));
  it("iniciales", () => {
    expect(iniciales("Asesora 1")).toBe("A1");
    expect(iniciales("Luis Pérez")).toBe("LP");
    expect(iniciales("Luis")).toBe("LU");
  });
});
