import { describe, expect, it } from "vitest";
import { puede, puedeVerCostos } from "../permisos";

describe("matriz de permisos", () => {
  it("Dueño puede todo", () => {
    for (const p of [
      "cotizar",
      "cancelar_viajes",
      "ver_finanzas",
      "cambiar_cuentas",
      "configuracion",
    ] as const)
      expect(puede("dueno", p)).toBe(true);
  });
  it("Asesora cotiza y confirma pagos, sin finanzas ni configuración", () => {
    expect(puede("asesora", "cotizar")).toBe(true);
    expect(puede("asesora", "confirmar_pagos")).toBe(true);
    expect(puede("asesora", "cancelar_viajes")).toBe(false);
    expect(puede("asesora", "ver_finanzas")).toBe(false);
    expect(puede("asesora", "cambiar_cuentas")).toBe(false);
    expect(puede("asesora", "configuracion")).toBe(false);
  });
  it("Contador ve finanzas y confirma pagos, sin cotizar", () => {
    expect(puede("contador", "ver_finanzas")).toBe(true);
    expect(puede("contador", "confirmar_pagos")).toBe(true);
    expect(puede("contador", "cotizar")).toBe(false);
    expect(puede("contador", "configuracion")).toBe(false);
  });
  it("Solo el Dueño agrega ciudades (configuración)", () => {
    expect(puede("dueno", "configuracion")).toBe(true);
    expect(puede("asesora", "configuracion")).toBe(false);
    expect(puede("contador", "configuracion")).toBe(false);
  });
});

describe("costos y utilidad", () => {
  it("la asesora solo ve los de sus viajes", () => {
    expect(puedeVerCostos("asesora", "a1", "a1")).toBe(true);
    expect(puedeVerCostos("asesora", "a1", "a2")).toBe(false);
    expect(puedeVerCostos("asesora", "a1", null)).toBe(false);
  });
  it("Dueño y Contador ven todos", () => {
    expect(puedeVerCostos("dueno", "d", "a2")).toBe(true);
    expect(puedeVerCostos("contador", "c", "a2")).toBe(true);
  });
});
