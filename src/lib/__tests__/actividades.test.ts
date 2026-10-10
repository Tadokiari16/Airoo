import { describe, expect, it } from "vitest";
import {
  cambiarTipo,
  queSePide,
  revisarActividad,
  SUGERIDOS,
  textoCobro,
  textoEdad,
  textoFicha,
  type FichaActividad,
} from "../actividades";

const xcaret: FichaActividad = {
  bloques: ["cobro", "planes", "boletos", "horarios", "llegada", "incluye", "requisitos", "confirmacion"],
  cobro: "edad",
  horarioTipo: "abierto",
  llegada: "por_su_cuenta",
  sePagaEnLugar: false,
  portada: { ancho: 2400, alto: 1350 },
  fotosGaleria: 24,
  descripcion: "Parque ecoarqueológico con ríos subterráneos.",
  duracion: "De 8:30 AM a 10:00 PM",
  proveedores: 2,
  planes: 2,
  boletos: 3,
  salidas: 0,
  maxPersonasGrupo: null,
};

describe("tipo y bloques", () => {
  it("cambiar el tipo sugiere bloques, pero no apaga ninguno que ya estaba encendido", () => {
    const antes = ["cobro", "boletos", "requisitos"];
    const despues = cambiarTipo(antes, "tour");
    for (const b of antes) expect(despues).toContain(b);
    for (const b of SUGERIDOS.tour) expect(despues).toContain(b);
    expect(despues).not.toContain("planes");
  });
  it("de parque a otro no se pierde nada", () => {
    expect(cambiarTipo(SUGERIDOS.parque, "otro")).toEqual(SUGERIDOS.parque);
  });
  it("los bloques quedan en el orden de la ficha", () => {
    expect(cambiarTipo(["confirmacion", "cobro"], "otro")).toEqual(["cobro", "confirmacion"]);
  });
});

describe("en el armador se va a pedir", () => {
  it("Xcaret pide plan y boletos por edad", () => {
    expect(queSePide(xcaret)).toEqual([
      "De qué proveedor sale la tarifa",
      "Qué plan",
      "Cuántos boletos de cada edad",
      "Fecha",
    ]);
  });
  it("salidas fijas y recogida agregan su pregunta", () => {
    expect(
      queSePide({
        ...xcaret,
        bloques: ["cobro", "horarios", "llegada"],
        cobro: "persona",
        horarioTipo: "salidas",
        llegada: "recogida",
      }),
    ).toEqual([
      "De qué proveedor sale la tarifa",
      "Cuántas personas",
      "Qué salida",
      "Hotel y hora de recogida",
      "Fecha",
    ]);
  });
  it("un bloque apagado no se pide aunque tenga datos", () => {
    expect(queSePide({ ...xcaret, bloques: ["cobro"] })).not.toContain("Qué plan");
  });
  it("si lo paga el cliente en el lugar no se pide proveedor", () => {
    expect(queSePide({ ...xcaret, sePagaEnLugar: true })[0]).toBe("Qué plan");
  });
});

describe("ficha de la actividad", () => {
  it("Xcaret está completa", () => {
    expect(textoFicha(revisarActividad(xcaret))).toBe("Completa");
  });
  it("sin proveedor queda por completar, salvo que se pague en el lugar", () => {
    expect(textoFicha(revisarActividad({ ...xcaret, proveedores: 0 }))).toBe("Sin proveedor ligado");
    expect(textoFicha(revisarActividad({ ...xcaret, proveedores: 0, sePagaEnLugar: true }))).toBe("Completa");
  });
  it("una ficha creada con lo mínimo dice que le faltan fotos y descripción", () => {
    expect(
      textoFicha(revisarActividad({ ...xcaret, portada: null, fotosGaleria: 0, descripcion: null })),
    ).toBe("Sin fotos ni descripción");
  });
  it("con 4 fotos explica cuántas conviene tener", () => {
    expect(textoFicha(revisarActividad({ ...xcaret, fotosGaleria: 4 }))).toBe(
      "Tiene 4 fotos; la propuesta se ve mejor con 5",
    );
  });
  it("un bloque encendido sin datos queda pendiente; apagado, no", () => {
    expect(textoFicha(revisarActividad({ ...xcaret, planes: 0 }))).toBe("Faltan los planes");
    expect(
      textoFicha(
        revisarActividad({ ...xcaret, planes: 0, bloques: xcaret.bloques.filter((b) => b !== "planes") }),
      ),
    ).toBe("Completa");
  });
  it("el cobro por grupo pide el máximo de personas", () => {
    expect(textoFicha(revisarActividad({ ...xcaret, cobro: "grupo" }))).toBe(
      "Falta el máximo de personas del grupo",
    );
  });
});

describe("textos de la actividad", () => {
  it("las edades se escriben como en el prototipo", () => {
    expect(textoEdad({ edadDesde: 12, edadHasta: null, gratis: false })).toBe("12 años o más");
    expect(textoEdad({ edadDesde: 5, edadHasta: 11, gratis: false })).toBe("5 a 11 años");
    expect(textoEdad({ edadDesde: 0, edadHasta: 4, gratis: true })).toBe("0 a 4 años · gratis");
    expect(textoEdad({ edadDesde: null, edadHasta: null, gratis: false })).toBe("Sin distinción de edad");
  });
  it("la columna «Cómo se cobra» resume boletos o planes", () => {
    expect(
      textoCobro({
        bloques: ["cobro", "boletos"],
        cobro: "edad",
        planes: [],
        boletos: ["Adulto", "Niño"],
        maxPersonasGrupo: null,
      }),
    ).toEqual({ titulo: "Por edad", sub: "Adulto · Niño" });
    expect(
      textoCobro({
        bloques: ["cobro", "planes"],
        cobro: "persona",
        planes: ["A", "B"],
        boletos: [],
        maxPersonasGrupo: null,
      }),
    ).toEqual({ titulo: "Por persona", sub: "2 planes" });
  });
});
