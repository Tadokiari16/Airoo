import { describe, expect, it } from "vitest";
import { aDiezmilesimos, leerRespuesta } from "../banxico";

describe("Banxico", () => {
  it("lee el FIX sin decimales flotantes", () => {
    expect(aDiezmilesimos("18.4200")).toBe(184200);
    expect(aDiezmilesimos("21.5")).toBe(215000);
    expect(aDiezmilesimos("N/E")).toBeNull();
  });
  it("lee la respuesta de la API con la fecha de cada serie", () => {
    const json = {
      bmx: {
        series: [
          { idSerie: "SF43718", titulo: "FIX", datos: [{ fecha: "09/10/2026", dato: "18.4200" }] },
          { idSerie: "SF46410", titulo: "Euro", datos: [{ fecha: "09/10/2026", dato: "21.3054" }] },
        ],
      },
    };
    expect(leerRespuesta(json)).toEqual([
      { moneda: "USD", fecha: "2026-10-09", diezmilesimos: 184200 },
      { moneda: "EUR", fecha: "2026-10-09", diezmilesimos: 213054 },
    ]);
  });
  it("ignora series sin dato (días inhábiles)", () => {
    expect(leerRespuesta({ bmx: { series: [{ idSerie: "SF43718", datos: [{ fecha: "10/10/2026", dato: "N/E" }] }] } })).toEqual([]);
    expect(leerRespuesta({})).toEqual([]);
  });
});
