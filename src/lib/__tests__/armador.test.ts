import { describe, expect, it } from "vitest";
import { horaTexto, leerHora, netosDe, partidaNueva, pendientes, tipoCambioDe, type PartidaArmador } from "../armador";

const fx = { fixUsd: 18_4200, fixEur: null, colchonPb: 150 };
const viaje = { adultos: 4, menores: 2, edadesMenores: [8, 6] };
const base = { utilidadPb: 1000, inicio: "2026-10-21", fin: "2026-10-27", orden: 0 };

function hotel(extra: Partial<PartidaArmador> = {}): PartidaArmador {
  return {
    ...partidaNueva("hotel", { ...base, id: "h" }),
    habitaciones: [
      { id: "1", habitacionId: "s", cama: "2 dobles", adultos: 2, menores: 1, neto: 12_100_00 },
      { id: "2", habitacionId: "s", cama: "2 dobles", adultos: 2, menores: 1, neto: 12_100_00 },
    ],
    ...extra,
  };
}
const nombres = { partida: { h: "Seadust", a: "Xel-Há", v: "Vuelo" } };

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

describe("netos y tipo de cambio", () => {
  it("el hotel suma sus habitaciones; lo demás, cantidad por neto", () => {
    expect(netosDe(hotel())).toEqual([12_100_00, 12_100_00]);
    const act = {
      ...partidaNueva("actividad", { ...base, id: "a" }),
      renglones: [{ id: "r", concepto: "Adulto", boletoId: null, cantidad: 4, netoUnitario: 1_094_00 }],
    };
    expect(netosDe(act)).toEqual([4_376_00]);
  });
  it("una tarifa en dólares usa el FIX de la cotización más el colchón", () => {
    expect(tipoCambioDe("USD", fx)).toBe(18_6963);
    expect(tipoCambioDe("EUR", fx)).toBeNull();
    expect(tipoCambioDe("MXN", fx)).toBeNull();
  });
});

describe("antes de enviar", () => {
  it("una cotización completa no tiene pendientes", () => {
    expect(pendientes([hotel()], viaje, fx, nombres)).toEqual([]);
  });
  it("sin servicios no se puede enviar", () => {
    expect(pendientes([], viaje, fx, nombres).map((p) => p.texto)).toEqual(["La cotización no tiene servicios"]);
  });
  it("habitación sin huéspedes, hotel sin neto y actividad sin fecha", () => {
    const h = hotel();
    h.habitaciones[1] = { ...h.habitaciones[1], adultos: 0, menores: 0, neto: null };
    const a = {
      ...partidaNueva("actividad", { ...base, id: "a" }),
      renglones: [{ id: "r", concepto: "Adulto", boletoId: null, cantidad: 4, netoUnitario: 1_000_00 }],
    };
    expect(pendientes([h, a], viaje, fx, nombres).map((p) => p.texto)).toEqual([
      "Habitación 2 sin huéspedes",
      "Seadust sin costo neto",
      "Xel-Há sin fecha",
    ]);
  });
  it("los huéspedes del hotel tienen que cuadrar con el viaje", () => {
    const h = hotel();
    h.habitaciones[1] = { ...h.habitaciones[1], menores: 0 };
    expect(pendientes([h], viaje, fx, nombres)[0].texto).toBe("Seadust acomoda 5 de 6 viajeros");
  });
  it("faltan edades de menores o tipo de cambio", () => {
    const h = hotel({ moneda: "EUR" });
    expect(pendientes([h], { ...viaje, edadesMenores: [8] }, fx, nombres).map((p) => p.texto)).toEqual([
      "Faltan edades de los menores",
      "Seadust en euros sin tipo de cambio",
    ]);
  });
  it("un vuelo sin horario completo", () => {
    const v: PartidaArmador = {
      ...partidaNueva("vuelo", { ...base, id: "v" }),
      renglones: [{ id: "r", concepto: "Vuelo", boletoId: null, cantidad: 1, netoUnitario: 2_683_00 }],
      tramos: [
        {
          id: "t",
          sentido: "ida",
          numero: "VB 2124",
          fecha: "2026-10-21",
          origen: "GDL",
          destino: "CUN",
          terminalSalida: "",
          terminalLlegada: "",
          sale: "16:55",
          llega: null,
          llegaDiaSiguiente: false,
          duracion: "",
          escalas: 0,
        },
      ],
    };
    expect(pendientes([v], viaje, fx, nombres).map((p) => p.texto)).toEqual(["Vuelo sin horario completo"]);
  });
});
