import { describe, expect, it } from "vitest";
import { ajustarEncuadre, encuadreInicial, encuadreValido, estiloEncuadre, evaluarPortada } from "../fotos";

describe("portada 16:9", () => {
  it("una horizontal de 2400 × 1350 queda lista", () => {
    expect(evaluarPortada(2400, 1350)).toEqual({
      estado: "lista",
      titulo: "Portada lista",
      detalle: "2400 × 1350 px · se ve nítida en celular y computadora.",
    });
  });
  it("una cuadrada de 1080 avisa que se recorta y que se ve pixeleada", () => {
    const e = evaluarPortada(1080, 1080);
    expect(e.estado).toBe("cuadrada");
    expect(e.titulo).toBe("La foto es cuadrada (1080 × 1080)");
    expect(e.detalle).toBe(
      "Para 16:9 se usa solo la franja marcada. Con 1080 px de ancho se ve pixeleada en pantallas grandes; conviene una horizontal de al menos 1600 px.",
    );
  });
  it("una cuadrada grande solo avisa del recorte", () => {
    expect(evaluarPortada(3000, 3000).detalle).toBe("Para 16:9 se usa solo la franja marcada.");
  });
  it("una vertical se marca como vertical", () => {
    expect(evaluarPortada(1200, 1800).estado).toBe("vertical");
  });
  it("una horizontal chica avisa la medida mínima", () => {
    const e = evaluarPortada(1280, 720);
    expect(e.estado).toBe("chica");
    expect(e.detalle).toContain("al menos 1600 × 900 px");
  });
  it("el mínimo exacto es suficiente", () => {
    expect(evaluarPortada(1600, 900).estado).toBe("lista");
  });
});

describe("encuadre", () => {
  it("en una cuadrada toma la franja central 16:9", () => {
    expect(encuadreInicial(1080, 1080)).toEqual({ x: 0, y: 0.2188, ancho: 1, alto: 0.5625 });
  });
  it("en una panorámica toma el centro a lo ancho", () => {
    const e = encuadreInicial(3200, 900);
    expect(e.alto).toBe(1);
    expect(e.ancho).toBe(0.5);
    expect(e.x).toBe(0.25);
  });
  it("al moverlo no se sale de la foto", () => {
    const e = ajustarEncuadre({ ancho: 1080, alto: 1080 }, { x: 0.5, y: 0.99 }, 1);
    expect(e.y + e.alto).toBeLessThanOrEqual(1);
    expect(e.y).toBe(0.4375);
  });
  it("al acercarlo conserva la proporción 16:9", () => {
    const e = ajustarEncuadre({ ancho: 2400, alto: 1350 }, { x: 0.5, y: 0.5 }, 2);
    expect((e.ancho * 2400) / (e.alto * 1350)).toBeCloseTo(16 / 9, 3);
    expect(e).toEqual({ x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 });
  });
  it("rechaza recortes que vienen mal del navegador", () => {
    expect(encuadreValido({ x: 0.5, y: 0, ancho: 0.7, alto: 1 })).toBeNull();
    expect(encuadreValido({ x: "0", y: 0, ancho: 1, alto: 1 })).toBeNull();
    expect(encuadreValido({ x: 0, y: 0.2, ancho: 1, alto: 0.5625 })).toEqual({
      x: 0,
      y: 0.2,
      ancho: 1,
      alto: 0.5625,
    });
  });
  it("el estilo muestra solo la parte elegida", () => {
    expect(estiloEncuadre({ x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 })).toMatchObject({
      width: "200%",
      height: "200%",
      left: "-50%",
      top: "-50%",
    });
  });
});
