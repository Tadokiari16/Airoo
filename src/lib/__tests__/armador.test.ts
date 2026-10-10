import { describe, expect, it } from "vitest";
import { aCalculo, calcular, horaTexto, leerHora, partidaNueva, tipoCambioDe } from "../armador";
import { aCentavos } from "../dinero";

const fx = { fixUsd: 18_4200, fixEur: null, colchonPb: 150 };
const base = { utilidadPb: 1000, inicio: "2026-10-21", fin: "2026-10-27", orden: 0 };

describe("horas escritas rápido", () => {
  it("entiende 745p, 7:45 pm, 1930 y 9a", () => {
    expect(leerHora("745p")).toBe("19:45");
    expect(leerHora("7:45 pm")).toBe("19:45");
    expect(leerHora("1930")).toBe("19:30");
    expect(leerHora("9a")).toBe("09:00");
    expect(leerHora("12a")).toBe("00:00");
    expect(leerHora("25")).toBeNull();
    expect(leerHora("hola")).toBeNull();
  });
  it("se muestran como en el prototipo", () => {
    expect(horaTexto("19:45")).toBe("07:45 PM");
    expect(horaTexto("00:30")).toBe("12:30 AM");
  });
});

describe("costo neto total por servicio", () => {
  it("cada tipo de servicio lleva un solo neto, el total que cobra el proveedor", () => {
    for (const tipo of ["hotel", "vuelo", "actividad", "servicio"] as const) {
      const p = { ...partidaNueva(tipo, { ...base, id: tipo }), netoTotal: 22_000_00 };
      expect(aCalculo(p, fx).netos).toEqual([22_000_00]);
    }
  });
  it("las habitaciones y los boletos no cambian el neto: solo dicen cuántos van", () => {
    const a = {
      ...partidaNueva("actividad", { ...base, id: "a" }),
      netoTotal: 4_364_00,
      renglones: [
        { id: "1", concepto: "Adulto", boletoId: null, cantidad: 4 },
        { id: "2", concepto: "Niño", boletoId: null, cantidad: 2 },
      ],
    };
    expect(aCalculo(a, fx).netos).toEqual([4_364_00]);
  });
  it("sin neto no hay precio", () => {
    expect(calcular(partidaNueva("hotel", { ...base, id: "h" }), fx).precio).toBeNull();
  });
  it("una tarifa en dólares usa el FIX de la cotización más el colchón", () => {
    expect(tipoCambioDe("USD", fx)).toBe(18_6963);
    expect(tipoCambioDe("EUR", fx)).toBeNull();
    expect(tipoCambioDe("MXN", fx)).toBeNull();
  });
  it("un monto lleva hasta 2 decimales", () => {
    expect(aCentavos("1,250.50")).toBe(1_250_50);
    expect(aCentavos("1250.5")).toBe(1_250_50);
    expect(aCentavos("1250.505")).toBeNull();
  });
});
