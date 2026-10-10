import { describe, expect, it } from "vitest";
import { enZona, horarioReal, instante, leerNumeroVuelo, minutosEntre, textoDuracion } from "../vuelos";
import { AEROPUERTOS } from "./aeropuertos-prueba";


const tramo = (origen: string, destino: string, fecha: string, sale: string, llega: string, llegaDias = 0) => ({
  origen,
  destino,
  fecha,
  sale,
  llega,
  llegaDias,
});
const duracion = (t: ReturnType<typeof tramo>) => {
  const h = horarioReal(t, AEROPUERTOS)!;
  return minutosEntre(h.sale, h.llega);
};

describe("hora local de cada aeropuerto", () => {
  it("Cancún va una hora adelante de Guadalajara: GDL 16:55 → CUN 20:26 son 2 h 31 min", () => {
    expect(duracion(tramo("GDL", "CUN", "2026-10-21", "16:55", "20:26"))).toBe(151);
  });
  it("Tijuana tiene horario de verano y el centro de México no", () => {
    // En octubre Tijuana está en UTC−7 hasta el 1 nov; Ciudad de México siempre en UTC−6.
    expect(duracion(tramo("TIJ", "MEX", "2026-10-21", "08:00", "13:40"))).toBe(4 * 60 + 40);
    expect(duracion(tramo("TIJ", "MEX", "2026-11-05", "08:00", "13:40"))).toBe(3 * 60 + 40);
  });
  it("vuelo nocturno con +1: MEX 23:55 → MAD 17:50 del día siguiente son 9 h 55 min", () => {
    const t = tramo("MEX", "MAD", "2026-10-21", "23:55", "17:50", 1);
    expect(duracion(t)).toBe(9 * 60 + 55);
    expect(horarioReal(t, AEROPUERTOS)!.diaLlegada).toBe("2026-10-22");
  });
  it("cambio de horario de verano en Madrid (25 oct 2026): el mismo horario dura una hora más", () => {
    expect(duracion(tramo("MAD", "CUN", "2026-10-24", "12:00", "16:00"))).toBe(11 * 60);
    expect(duracion(tramo("MAD", "CUN", "2026-10-25", "12:00", "16:00"))).toBe(10 * 60);
  });
  it("un vuelo que cruza el cambio de horario: CUN 21:00 del 24 → MAD 12:00 del 25 son 9 h", () => {
    expect(duracion(tramo("CUN", "MAD", "2026-10-24", "21:00", "12:00", 1))).toBe(9 * 60);
  });
  it("instante y enZona son inversos", () => {
    const ms = instante("2026-10-25", "12:00", "Europe/Madrid");
    expect(new Date(ms).toISOString()).toBe("2026-10-25T11:00:00.000Z");
    expect(enZona(ms, "America/Cancun")).toEqual({ dia: "2026-10-25", hora: "06:00" });
  });
  it("sin aeropuerto u hora no hay horario", () => {
    expect(horarioReal(tramo("XXX", "CUN", "2026-10-21", "10:00", "12:00"), AEROPUERTOS)).toBeNull();
    expect(horarioReal({ ...tramo("GDL", "CUN", "2026-10-21", "10:00", "12:00"), llega: null }, AEROPUERTOS)).toBeNull();
  });
});

describe("textos", () => {
  it("duración como «2 h 35 min»", () => {
    expect(textoDuracion(155)).toBe("2 h 35 min");
    expect(textoDuracion(45)).toBe("45 min");
    expect(textoDuracion(120)).toBe("2 h");
    expect(textoDuracion(0)).toBe("0 min");
  });
  it("número de vuelo: clave de la aerolínea y de 1 a 4 dígitos", () => {
    expect(leerNumeroVuelo("vb2124")).toEqual({ clave: "VB", numero: "2124", texto: "VB 2124" });
    expect(leerNumeroVuelo("Y4 5")?.texto).toBe("Y4 5");
    expect(leerNumeroVuelo("4O 123")?.clave).toBe("4O");
    expect(leerNumeroVuelo("VB 21245")).toBeNull();
    expect(leerNumeroVuelo("VB")).toBeNull();
    expect(leerNumeroVuelo("12 345")).toBeNull();
    expect(leerNumeroVuelo("VBX 12")).toBeNull();
  });
});
