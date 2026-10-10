import { describe, expect, it } from "vitest";
import { formatoFecha, formatoFechaHora, formatoFechaLarga, saludo } from "../fechas";

// 21 oct 2026, 4:55 PM en Cancún (UTC-5) = 21:55 UTC
const vuelo = new Date("2026-10-21T21:55:00Z");

describe("fechas en hora de Cancún", () => {
  it("formato corto", () => expect(formatoFecha(vuelo)).toBe("Mié 21 oct"));
  it("formato largo", () =>
    expect(formatoFechaLarga(new Date("2026-09-29T15:00:00Z"))).toBe("Martes 29 de septiembre"));
  it("fecha y hora", () => expect(formatoFechaHora(vuelo)).toBe("Mié 21 oct, 4:55 PM"));
  it("usa la zona de Cancún, no UTC", () =>
    // 2:00 UTC del 22 oct todavía es 21 oct en Cancún
    expect(formatoFecha(new Date("2026-10-22T02:00:00Z"))).toBe("Mié 21 oct"));
  it("saludo según la hora", () => {
    expect(saludo(new Date("2026-10-21T14:00:00Z"))).toBe("Buenos días"); // 9 AM
    expect(saludo(new Date("2026-10-21T20:00:00Z"))).toBe("Buenas tardes"); // 3 PM
    expect(saludo(new Date("2026-10-22T02:00:00Z"))).toBe("Buenas noches"); // 9 PM
  });
});
