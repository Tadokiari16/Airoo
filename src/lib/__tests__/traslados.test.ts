import { describe, expect, it } from "vitest";
import {
  avisosCapacidad,
  errorCapacidad,
  estadoLiga,
  hotelesDelViaje,
  ligar,
  proponerTrayectos,
  restarHoras,
  revisarUnidad,
  textoCapacidad,
  textoFichaUnidad,
  unidadSugerida,
} from "../traslados";

const unidades = [
  { id: "s", nombre: "Sedán", pasajeros: 3, maletas: 3, adaptada: false },
  { id: "v", nombre: "Van", pasajeros: 10, maletas: 10, adaptada: false },
  { id: "u", nombre: "SUV", pasajeros: 5, maletas: 5, adaptada: false },
  { id: "p", nombre: "Sprinter", pasajeros: 18, maletas: 18, adaptada: false },
  { id: "a", nombre: "Van adaptada", pasajeros: 6, maletas: 6, adaptada: true },
];

describe("traslados", () => {
  it("describe la capacidad", () => {
    expect(textoCapacidad({ pasajeros: 6, maletas: 6 })).toBe("Hasta 6 pasajeros · 6 maletas");
    expect(textoCapacidad({ pasajeros: 1, maletas: 1 })).toBe("Hasta 1 pasajero · 1 maleta");
  });

  it("sugiere la unidad más chica en la que cabe el grupo", () => {
    expect(unidadSugerida(unidades, 2, null)?.id).toBe("s");
    expect(unidadSugerida(unidades, 4, null)?.id).toBe("u");
    expect(unidadSugerida(unidades, 4, 7)?.id).toBe("v");
    expect(unidadSugerida(unidades, 30, null)?.id).toBe("p");
  });

  it("propone una adaptada solo si se pide", () => {
    expect(unidadSugerida(unidades, 4, null, true)?.id).toBe("a");
    expect(unidades.filter((u) => u.adaptada)).toHaveLength(1);
    expect(unidadSugerida(unidades, 6, null)?.id).toBe("v");
  });

  it("avisa si pasajeros o maletas exceden", () => {
    expect(avisosCapacidad(unidades[4], 6, 6)).toEqual([]);
    expect(avisosCapacidad(unidades[4], 7, 8)).toEqual([
      "Son 7 pasajeros y la unidad Van adaptada lleva hasta 6.",
      "Son 8 maletas y la unidad Van adaptada lleva hasta 6.",
    ]);
    expect(avisosCapacidad(unidades[0], 3, null)).toEqual([]);
  });

  it("revisa la ficha", () => {
    expect(textoFichaUnidad(revisarUnidad({ foto: "x", descripcion: "Sedán" }))).toBe("Completa");
    expect(textoFichaUnidad(revisarUnidad({ foto: null, descripcion: "Sedán" }))).toBe("Falta la foto");
    expect(textoFichaUnidad(revisarUnidad({ foto: null, descripcion: " " }))).toBe("Faltan foto y descripción");
  });

  it("valida la capacidad", () => {
    expect(errorCapacidad({ pasajeros: 6, maletas: 0 })).toBeNull();
    expect(errorCapacidad({ pasajeros: 0, maletas: 2 })).toMatch(/pasajeros/);
    expect(errorCapacidad({ pasajeros: 3, maletas: -1 })).toMatch(/maletas/);
  });
});

describe("traslado en el armador", () => {
  const ida = { id: "i", sentido: "ida" as const, numero: "VB 2124", fecha: "2026-10-21", origen: "GDL", destino: "CUN", sale: "23:10", llega: "01:20", llegaDias: 1 };
  const regreso = { id: "r", sentido: "regreso" as const, numero: "VB 2125", fecha: "2026-10-27", origen: "CUN", destino: "GDL", sale: "18:13", llega: "19:45", llegaDias: 0 };
  let n = 0;
  const base = {
    tramos: [ida, regreso],
    hoteles: { llegada: "Seadust", salida: "Seadust" },
    ciudadDe: (i: string) => ({ CUN: "Cancún", GDL: "Guadalajara" })[i],
    viaje: { inicio: "2026-10-21", fin: "2026-10-27" },
    actuales: [],
    nuevoId: () => `n${++n}`,
  };

  it("propone aeropuerto–hotel redondo con el vuelo y el hotel", () => {
    const [a, b] = proponerTrayectos({ ...base, sentido: "redondo", direccion: "llegada" });
    expect(a).toMatchObject({
      desde: "Aeropuerto de Cancún (CUN)",
      hasta: "Seadust",
      // Llega al día siguiente: el traslado es ese día, a la hora de llegada.
      fecha: "2026-10-22",
      hora: "01:20",
      vueloTramoId: "i",
      vueloFecha: "2026-10-22",
      vueloHora: "01:20",
    });
    expect(b).toMatchObject({ desde: "Seadust", hasta: "Aeropuerto de Cancún (CUN)", fecha: "2026-10-27", hora: null, vueloTramoId: "r", vueloHora: "18:13" });
  });

  it("sencillo de salida, y sin vuelo con las fechas del viaje", () => {
    expect(proponerTrayectos({ ...base, sentido: "sencillo", direccion: "salida" })).toHaveLength(1);
    const [a] = proponerTrayectos({ ...base, tramos: [], hoteles: { llegada: null, salida: null }, sentido: "sencillo", direccion: "llegada" });
    expect(a).toMatchObject({ desde: "Aeropuerto", hasta: "Hotel", fecha: "2026-10-21", hora: null, vueloTramoId: null });
  });

  it("nota cuando el vuelo cambia o ya no está", () => {
    const [a] = proponerTrayectos({ ...base, sentido: "sencillo", direccion: "llegada" });
    const tramos = { i: ida };
    expect(estadoLiga(a, tramos)).toBe("ok");
    expect(estadoLiga(a, { i: { ...ida, llega: "02:00" } })).toBe("cambio");
    expect(estadoLiga(a, {})).toBe("sin_vuelo");
    expect(estadoLiga({ ...a, vueloTramoId: null }, tramos)).toBe("sin_vuelo");
    expect(estadoLiga(ligar(a, undefined), tramos)).toBe("sin_liga");
  });

  it("resta las horas para llegar al aeropuerto", () => {
    expect(restarHoras("18:13", 2)).toEqual({ hora: "16:13", diaAntes: false });
    expect(restarHoras("01:30", 3)).toEqual({ hora: "22:30", diaAntes: true });
    expect(restarHoras("10:00", 2.5)).toEqual({ hora: "07:30", diaAntes: false });
  });

  it("toma el hotel de la llegada y el de la salida; con opciones no hay uno solo", () => {
    expect(
      hotelesDelViaje([
        { opcionId: null, fechaInicio: "2026-10-24", nombre: "Casa Mexicana" },
        { opcionId: null, fechaInicio: "2026-10-21", nombre: "Seadust" },
      ]),
    ).toEqual({ llegada: "Seadust", salida: "Casa Mexicana" });
    expect(hotelesDelViaje([{ opcionId: "o", fechaInicio: "2026-10-21", nombre: "Seadust" }])).toEqual({ llegada: null, salida: null });
  });
});
