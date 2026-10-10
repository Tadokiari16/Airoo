import { describe, expect, it } from "vitest";
import {
  MODELO_SUGERIDO,
  queSePide,
  revisarServicio,
  textoFicha,
  textoPasajeros,
  textoVariantes,
  VALORES_TIPO,
} from "../servicios";

const base = {
  tipo: "traslado" as const,
  modeloCobro: "vehiculo" as const,
  descripcion: "Traslado privado",
  clienteRecibe: "Datos del chofer un día antes",
  variantes: 4,
  proveedores: 0,
  variaPorReserva: true,
};

describe("servicios", () => {
  it("cada tipo empieza con su modelo de cobro", () => {
    for (const t of VALORES_TIPO) expect(MODELO_SUGERIDO[t]).toBeTruthy();
    expect(MODELO_SUGERIDO.traslado).toBe("vehiculo");
    expect(MODELO_SUGERIDO.seguro).toBe("persona_dia");
    expect(MODELO_SUGERIDO.reservacion).toBe("fijo");
  });

  it("nombra las variantes según el tipo", () => {
    expect(textoVariantes("traslado", 4)).toBe("4 unidades");
    expect(textoVariantes("seguro", 1)).toBe("1 plan");
    expect(textoVariantes("equipo", 0)).toBe("Sin tipos");
  });

  it("escribe pasajeros y maletas como en el prototipo", () => {
    expect(textoPasajeros(6, "rampa")).toBe("Hasta 6 · rampa");
    expect(textoPasajeros(10)).toBe("Hasta 10");
    expect(textoPasajeros(null)).toBe("—");
  });

  it("el armador pide la variante solo si hay variantes", () => {
    expect(queSePide({ tipo: "traslado", modeloCobro: "vehiculo", variantes: 2 })).toEqual([
      "Unidad",
      "Origen y destino",
      "Fecha y hora",
      "Sencillo o redondo",
    ]);
    expect(queSePide({ tipo: "reservacion", modeloCobro: "fijo", variantes: 0 })).toEqual(["Fecha"]);
  });

  it("«varía por reserva» no cuenta como proveedor faltante", () => {
    expect(textoFicha(revisarServicio(base))).toBe("Completa");
    expect(textoFicha(revisarServicio({ ...base, variaPorReserva: false }))).toBe("Falta el proveedor");
  });

  it("un traslado por vehículo sin unidades queda por completar", () => {
    const r = revisarServicio({ ...base, variantes: 0, descripcion: null });
    expect(r.filter((x) => !x.ok).map((x) => x.falta)).toEqual([
      "Falta lo que ve el cliente",
      "Faltan las unidades",
    ]);
    expect(textoFicha(r)).toBe("Faltan 2 cosas");
  });
});
