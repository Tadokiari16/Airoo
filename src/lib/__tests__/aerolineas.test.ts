import { describe, expect, it } from "vitest";
import {
  buscarIata,
  errorMaleta,
  limpiarIata,
  textoCheckin,
  textoEquipaje,
  textoFuente,
  textoLlegarAntes,
  textoMaleta,
  textoTarifa,
  type Tarifa,
} from "../aerolineas";

const nada = { piezas: 0, kg: null };
const t = (nombre: string, kg: number | null, piezas = 1): Tarifa => ({
  nombre,
  mano: nada,
  documentado: kg ? { piezas, kg } : nada,
  cambios: null,
  articuloPersonal: true,
});

describe("aerolíneas", () => {
  it("equipaje documentado: el máximo y desde qué tarifa", () => {
    expect(textoEquipaje([t("Zero", null), t("Light", null), t("Switch", 15)])).toEqual({
      titulo: "Hasta 15 kg",
      sub: "Desde la tarifa Switch",
    });
    expect(textoEquipaje([t("Básica", null), t("Clásica", 25), t("Plus", 23, 2)]).titulo).toBe(
      "Hasta 2 piezas de 23 kg",
    );
    expect(textoEquipaje([t("Básica", null)]).titulo).toBe("No incluye");
    expect(textoEquipaje([]).titulo).toBe("Sin tarifas");
  });

  it("equipaje con opciones cerradas: no incluye, o piezas y kilos", () => {
    expect(textoMaleta(nada)).toBe("No incluye");
    expect(textoMaleta({ piezas: 1, kg: 10 })).toBe("10 kg");
    expect(textoMaleta({ piezas: 2, kg: 23 })).toBe("2 piezas de 23 kg");
    expect(errorMaleta({ piezas: 1, kg: null }, "Mano")).toBe("Mano: faltan los kilos por pieza.");
    expect(errorMaleta({ piezas: 1, kg: 80 }, "Documentada")).toBe("Documentada: de 1 a 50 kg por pieza.");
    expect(errorMaleta({ piezas: 0, kg: null }, "Mano")).toBeNull();
  });

  it("la tarifa en el armador dice artículo personal, mano y documentada", () => {
    expect(textoTarifa({ mano: { piezas: 1, kg: 10 }, documentado: { piezas: 1, kg: 25 }, articuloPersonal: true })).toBe(
      "Artículo personal + mano 10 kg + documentada 25 kg",
    );
    expect(textoTarifa({ mano: nada, documentado: nada, articuloPersonal: false })).toBe("Sin equipaje");
    expect(textoTarifa({ mano: { piezas: 1, kg: 10 }, documentado: nada, articuloPersonal: false })).toBe("Mano 10 kg");
  });

  it("check-in: cuenta las ventanas sin verificar y dice de dónde salen", () => {
    expect(textoCheckin([{ fuente: "terceros" }, { fuente: "terceros" }])).toEqual({
      titulo: "2 ventanas por verificar",
      sub: "Fuentes de terceros",
      pendientes: 2,
    });
    expect(textoCheckin([{ fuente: "sin_fuente" }, { fuente: "sin_fuente" }]).sub).toBe("Sin fuente todavía");
    expect(textoCheckin([{ fuente: "verificado" }, { fuente: "terceros" }]).titulo).toBe(
      "1 ventana por verificar",
    );
    expect(textoCheckin([{ fuente: "verificado" }, { fuente: "verificado" }]).titulo).toBe("Verificado");
  });

  it("escribe la fuente como el prototipo", () => {
    expect(textoFuente({ fuente: "terceros", fuenteTexto: "eSky" })).toBe("Guía de terceros (eSky)");
    expect(textoFuente({ fuente: "sin_fuente", fuenteTexto: null })).toBe("Sin fuente todavía");
  });

  it("el código IATA son dos letras o números", () => {
    expect(limpiarIata(" vb ")).toBe("VB");
    expect(limpiarIata("Y4")).toBe("Y4");
    expect(limpiarIata("VIV")).toBeNull();
    expect(limpiarIata("V")).toBeNull();
  });

  it("busca primero el código exacto y luego por nombre", () => {
    const lista = [
      { iata: "VB", nombre: "VivaAerobus", pais: "México" },
      { iata: "VI", nombre: "Volga-Dnepr Airlines", pais: "Rusia" },
      { iata: "Y4", nombre: "Volaris", pais: "México" },
      { iata: "TX", nombre: "Air Caraïbes", pais: "Francia" },
    ];
    expect(buscarIata(lista, "vb").map((a) => a.iata)).toEqual(["VB"]);
    expect(buscarIata(lista, "vol").map((a) => a.iata)).toEqual(["Y4", "VI"]);
    expect(buscarIata(lista, "caraibes").map((a) => a.iata)).toEqual(["TX"]);
    expect(buscarIata(lista, "  ")).toEqual([]);
  });

  it("llegar antes es una regla general", () => {
    expect(textoLlegarAntes({ nacional: 2, internacional: 3 })).toBe("2 h en nacional, 3 h en internacional");
  });
});
