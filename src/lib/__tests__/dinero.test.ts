import { describe, expect, it } from "vitest";
import { aCentavos, formatoDinero } from "../dinero";

describe("formatoDinero", () => {
  it("pesos con centavos", () => expect(formatoDinero(4224848)).toBe("$42,248.48"));
  it("pesos sin centavos", () => expect(formatoDinero(4224800)).toBe("$42,248"));
  it("dólares", () => expect(formatoDinero(198000, "USD")).toBe("US$1,980"));
  it("euros con centavos", () => expect(formatoDinero(250, "EUR")).toBe("€2.50"));
  it("cero", () => expect(formatoDinero(0)).toBe("$0"));
  it("negativo", () => expect(formatoDinero(-30000)).toBe("−$300"));
  it("rechaza decimales", () => expect(() => formatoDinero(10.5)).toThrow());
});

describe("aCentavos", () => {
  it("lee comas y signo", () => expect(aCentavos("$42,248.48")).toBe(4224848));
  it("un decimal", () => expect(aCentavos("42248.5")).toBe(4224850));
  it("entero", () => expect(aCentavos("300")).toBe(30000));
  it("inválido", () => expect(aCentavos("12.345")).toBeNull());
  it("vacío", () => expect(aCentavos("")).toBeNull());
});
