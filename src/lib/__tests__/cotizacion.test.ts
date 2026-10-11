import { describe, expect, it } from "vitest";
import {
  calcularPartida,
  comision,
  fechasFlexibles,
  huespedesNuevaHabitacion,
  netoEnPesos,
  planDePagos,
  precioPorPersona,
  bebesDe,
  pasajerosConPrecio,
  precioCliente,
  repartirHuespedes,
  textoTipoCambio,
  tipoCambioConColchon,
  totales,
  vigencia,
  type PartidaCalculo,
} from "../cotizacion";

const base = (p: Partial<PartidaCalculo>): PartidaCalculo => ({
  id: "x",
  tipo: "servicio",
  opcionId: null,
  moneda: "MXN",
  tipoCambio: null,
  utilidadPb: 1000,
  netos: [0],
  pagoProveedor: "al_reservar",
  anticipoProveedorPb: 0,
  reembolsable: false,
  pagarAntes: null,
  ...p,
});

describe("precio y tipo de cambio", () => {
  it("el vuelo de Nataly: $2,683 al 2.5% fijo da $2,750.08", () => {
    expect(precioCliente(2_683_00, 250)).toBe(2_750_08);
  });
  it("el hotel: $17,000 al 10% da $18,700", () => {
    expect(precioCliente(17_000_00, 1000)).toBe(18_700_00);
  });
  it("FIX 18.42 con colchón de 1.5% queda en 18.6963 y se muestra 18.70", () => {
    const tc = tipoCambioConColchon(18_4200, 150);
    expect(tc).toBe(18_6963);
    expect(textoTipoCambio(tc)).toBe("18.70");
  });
  it("una tarifa en dólares se pasa a pesos con el tipo de cambio guardado", () => {
    expect(netoEnPesos(1_980_00, "USD", 18_6963)).toBe(37_018_67);
    expect(netoEnPesos(1_980_00, "USD", null)).toBeNull();
    expect(netoEnPesos(1_980_00, "MXN", null)).toBe(1_980_00);
  });
  it("sin neto o sin tipo de cambio la partida no tiene precio", () => {
    expect(calcularPartida(base({ netos: [null] })).precio).toBeNull();
    expect(calcularPartida(base({ netos: [] })).precio).toBeNull();
    expect(calcularPartida(base({ moneda: "USD", netos: [100_00] })).precio).toBeNull();
  });
  it("pago con anticipo al proveedor: lo demás se paga en el destino", () => {
    // Xel-Há: neto $4,364 con 25% de anticipo → $3,273 en destino.
    const c = calcularPartida(base({ netos: [4_364_00], pagoProveedor: "anticipo", anticipoProveedorPb: 2500 }));
    expect(c.precio).toBe(4_800_40);
    expect(c.enDestino).toBe(3_273_00);
  });
});

// El viaje de Nataly con Seadust (prototipo CotizacionCliente-Movil-v4).
const seadust = base({
  id: "h",
  tipo: "hotel",
  netos: [11_000_00, 11_000_00],
  reembolsable: true,
  pagarAntes: "2026-10-14",
});
const viajeNataly = [
  seadust,
  base({ id: "v", tipo: "vuelo", netos: [2_683_00], utilidadPb: 250 }),
  base({ id: "a1", tipo: "actividad", netos: [4_364_00] }),
  base({ id: "a2", tipo: "actividad", netos: [5_836_36] }),
  base({ id: "t", tipo: "servicio", netos: [2_400_00] }),
  base({ id: "s", tipo: "servicio", netos: [1_080_00] }),
];
const ajustes = { cargoServicio: 250_00, conIva: false, ivaPb: 1600, personas: 6 };

describe("totales de una opción", () => {
  it("suma secciones, cargo por servicio y ganancia", () => {
    const t = totales(viajeNataly, ajustes);
    expect(t.secciones.hospedaje).toBe(24_200_00);
    expect(t.secciones.vuelos).toBe(2_750_08);
    expect(t.cargoServicio).toBe(250_00);
    expect(t.total).toBe(t.subtotal);
    expect(t.ganancia).toBe(t.subtotal - t.costo);
    expect(t.completo).toBe(true);
  });
  it("el IVA solo se suma si se activa, sobre todo incluido el cargo", () => {
    const sin = totales(viajeNataly, ajustes);
    const con = totales(viajeNataly, { ...ajustes, conIva: true });
    expect(con.iva).toBe(Math.round(sin.subtotal * 0.16));
    expect(con.total).toBe(sin.subtotal + con.iva);
  });
  it("una partida sin neto deja el total incompleto", () => {
    expect(totales([...viajeNataly, base({ netos: [null] })], ajustes).completo).toBe(false);
  });
});

describe("plan de pagos", () => {
  const plan = (hoy: string, partidas = viajeNataly, extra = {}) =>
    planDePagos(partidas, { ...ajustes, inicio: "2026-10-21", hoy, diasAntesViaje: 15, ...extra });

  it("pago final: 2 días antes de pagar al hotel, pero nunca después de 15 días antes del viaje", () => {
    // Hotel se paga el 14 oct → 12 oct; viaje el 21 oct → 6 oct. Gana el 6.
    expect(fechasFlexibles(viajeNataly, "2026-10-21", 15)).toEqual({ segundo: "2026-09-29", final: "2026-10-06" });
    // Si el hotel se paga antes, gana la fecha del hotel.
    const temprano = [{ ...seadust, pagarAntes: "2026-10-02" }];
    expect(fechasFlexibles(temprano, "2026-10-21", 15)).toEqual({ segundo: "2026-09-23", final: "2026-09-30" });
  });
  it("anticipo con todo lo que se paga al reservar y el hotel en dos pagos", () => {
    const p = plan("2026-09-20");
    expect(p.map((x) => x.concepto)).toEqual(["Anticipo", "Segundo pago", "Pago final"]);
    expect(p[1].monto).toBe(12_100_00);
    expect(p[2].monto).toBe(12_100_00);
    expect(p[0].monto).toBe(totales(viajeNataly, ajustes).total - 24_200_00);
    expect(p[2].vence).toBe("2026-10-06");
  });
  it("si ya pasó la fecha del segundo pago, queda anticipo y pago final", () => {
    const p = plan("2026-09-30");
    expect(p.map((x) => x.concepto)).toEqual(["Anticipo", "Pago final"]);
    expect(p[1].monto).toBe(24_200_00);
  });
  it("si ya no da tiempo, es un pago único", () => {
    const p = plan("2026-10-06");
    expect(p).toEqual([{ concepto: "Pago único", monto: totales(viajeNataly, ajustes).total, vence: null }]);
  });
  it("un hotel no reembolsable va completo en el anticipo", () => {
    const p = plan("2026-09-20", [{ ...seadust, reembolsable: false }, ...viajeNataly.slice(1)]);
    expect(p.map((x) => x.concepto)).toEqual(["Pago único"]);
  });
  it("solo hospedaje: tres partes iguales y el cargo va en el anticipo", () => {
    const p = plan("2026-09-20", [seadust]);
    expect(p.map((x) => x.monto)).toEqual([8_066_68 + 250_00, 8_066_66, 8_066_66]);
  });
  it("con IVA la suma de los pagos es el total", () => {
    const p = plan("2026-09-20", viajeNataly, { conIva: true });
    const t = totales(viajeNataly, { ...ajustes, conIva: true });
    expect(p.reduce((s, x) => s + x.monto, 0)).toBe(t.total);
  });
  it("lo que se paga en el lugar no entra en los pagos a Airoo", () => {
    const enLugar = base({ id: "l", tipo: "actividad", netos: [1_000_00], pagoProveedor: "en_el_lugar" });
    const p = plan("2026-09-20", [...viajeNataly, enLugar]);
    const t = totales([...viajeNataly, enLugar], ajustes);
    expect(p.reduce((s, x) => s + x.monto, 0)).toBe(t.total - 1_000_00);
  });
});

describe("vigencia", () => {
  it("7 días, sin pasar del día antes de pagar al hotel", () => {
    expect(vigencia("2026-09-30", 7, ["2026-10-14"]).propuesta).toBe("2026-10-07");
    expect(vigencia("2026-10-10", 7, ["2026-10-14"])).toEqual({ propuesta: "2026-10-13", maxima: "2026-10-13" });
    expect(vigencia("2026-10-10", 7, [null]).maxima).toBeNull();
  });
});

describe("huéspedes", () => {
  it("4 adultos y 2 menores en 2 habitaciones quedan 2+1 y 2+1", () => {
    expect(repartirHuespedes(4, 2, 2)).toEqual([
      { adultos: 2, menores: 1 },
      { adultos: 2, menores: 1 },
    ]);
  });
  it("una habitación nueva recibe a los que faltan, hasta 4", () => {
    expect(huespedesNuevaHabitacion({ adultos: 4, menores: 2 }, [{ adultos: 2, menores: 1 }])).toEqual({
      adultos: 2,
      menores: 1,
    });
    expect(huespedesNuevaHabitacion({ adultos: 4, menores: 2 }, [{ adultos: 4, menores: 2 }])).toEqual({
      adultos: 0,
      menores: 0,
    });
  });
});

describe("comisión de la asesora", () => {
  it("venta $20,000, utilidad $2,000 → Airoo $700, asesora $1,300", () => {
    expect(comision(2_000_00, 35)).toEqual({ airoo: 700_00, asesora: 1_300_00 });
  });
});

describe("precio por persona", () => {
  it("divide entre los pasajeros del viaje, no entre los huéspedes de las habitaciones", () => {
    // $5,400 con 2 pasajeros: $2,700 por persona, aunque las habitaciones sumen 11 huéspedes.
    expect(precioPorPersona(540_000, 2)).toBe(270_000);
    // Con 11 huéspedes daba $490.91: ese cálculo ya no se usa.
    expect(precioPorPersona(540_000, 11)).toBe(49_091);
  });

  it("no cuenta a los bebés: 2 adultos y un bebé dividen entre 2", () => {
    expect(bebesDe([1], 1)).toBe(1);
    expect(bebesDe([1, 5, 15], 3)).toBe(1);
    // Un menor sin edad se cuenta como menor, no como bebé.
    expect(bebesDe([], 2)).toBe(0);
    expect(pasajerosConPrecio(2, 1, [1])).toBe(2);
    expect(pasajerosConPrecio(2, 2, [1, 9])).toBe(3);
    expect(precioPorPersona(540_000, pasajerosConPrecio(2, 1, [1]))).toBe(270_000);
    const t = totales([], { cargoServicio: 540_000, conIva: false, ivaPb: 1600, personas: 2, bebes: 1 });
    expect(t.porPersona).toBe(270_000);
    expect(t.bebes).toBe(1);
  });

  it("redondea al centavo y no divide entre cero", () => {
    expect(precioPorPersona(100_000, 3)).toBe(33_333);
    expect(precioPorPersona(100_000, 0)).toBeNull();
  });

  it("el total de la opción también se reparte entre los pasajeros", () => {
    const t = totales([], { cargoServicio: 540_000, conIva: false, ivaPb: 1600, personas: 2 });
    expect(t.porPersona).toBe(270_000);
  });
});
