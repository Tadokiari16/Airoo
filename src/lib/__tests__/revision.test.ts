import { describe, expect, it } from "vitest";
import { partidaNueva, type PartidaArmador, type TramoArmador } from "../armador";
import { erroresDe, revisarCotizacion, revisarPartida, tiemposDeVuelo, type ContextoRevision } from "../revision";
import { AEROPUERTOS } from "./aeropuertos-prueba";

const base = { utilidadPb: 1000, inicio: "2026-10-21", fin: "2026-10-27", orden: 0 };
const ctx: ContextoRevision = {
  viaje: { inicio: "2026-10-21", fin: "2026-10-27", adultos: 4, menores: 2, edadesMenores: [8, 6] },
  hoy: "2026-10-10",
  fx: { fixUsd: 18_4200, fixEur: null, colchonPb: 150 },
  aeropuertos: AEROPUERTOS,
  aerolineas: ["VB", "Y4", "AM", "IB"],
  nombres: { h: "Seadust", v: "Vuelo VB", a: "Xel-Há", s: "Traslado" },
};

let n = 0;
const t = (
  sentido: "ida" | "regreso",
  numero: string,
  origen: string,
  destino: string,
  fecha: string,
  sale: string,
  llega: string,
  llegaDias = 0,
): TramoArmador => ({
  id: `t${++n}`,
  sentido,
  numero,
  origen,
  destino,
  fecha,
  sale,
  llega,
  llegaDias,
  terminalSalida: "",
  terminalLlegada: "",
});

const IDA = () => t("ida", "VB 2124", "GDL", "CUN", "2026-10-21", "16:55", "20:26");
const REGRESO = () => t("regreso", "VB 2125", "CUN", "GDL", "2026-10-27", "18:13", "19:45");

function vuelo(tramos: TramoArmador[], extra: Partial<PartidaArmador> = {}): PartidaArmador {
  return {
    ...partidaNueva("vuelo", { ...base, id: "v" }),
    netoTotal: 2_683_00,
    detalle: { redondo: true, pasajeros: 6 },
    tramos,
    ...extra,
  };
}
function hotel(extra: Partial<PartidaArmador> = {}): PartidaArmador {
  return {
    ...partidaNueva("hotel", { ...base, id: "h" }),
    netoTotal: 22_000_00,
    habitaciones: [
      { id: "1", habitacionId: "x", cama: null, adultos: 2, menores: 1 },
      { id: "2", habitacionId: "x", cama: null, adultos: 2, menores: 1 },
    ],
    ...extra,
  };
}

const textos = (p: PartidaArmador, nivel?: "error" | "falta" | "aviso" | "observacion") =>
  revisarPartida(p, ctx)
    .filter((h) => !nivel || h.nivel === nivel)
    .map((h) => h.texto);

describe("el vuelo de ejemplo no tiene nada que revisar", () => {
  it("GDL → CUN y regreso, 6 pasajeros, dentro del viaje", () => {
    expect(revisarCotizacion([hotel(), vuelo([IDA(), REGRESO()])], ctx)).toEqual([]);
  });
});

describe("errores del vuelo: impiden enviar, no la captura", () => {
  it("origen igual a destino", () => {
    expect(textos(vuelo([t("ida", "VB 2124", "CUN", "CUN", "2026-10-21", "10:00", "12:00")]), "error")).toEqual([
      "VB 2124 sale y llega al mismo aeropuerto, Cancún (CUN).",
    ]);
  });
  it("aeropuerto que no está en la lista", () => {
    expect(textos(vuelo([t("ida", "VB 2124", "GDL", "QQQ", "2026-10-21", "10:00", "12:00")]), "error")).toEqual([
      "VB 2124: el aeropuerto QQQ no está en la lista de aeropuertos.",
    ]);
  });
  it("aerolínea que no está en el catálogo y número mal escrito", () => {
    const v = vuelo([
      t("ida", "ZZ 100", "GDL", "CUN", "2026-10-21", "16:55", "20:26"),
      t("ida", "VB-21245", "CUN", "CZM", "2026-10-21", "22:00", "22:40"),
    ]);
    const e = textos(v, "error");
    expect(e).toContain("ZZ 100: la aerolínea ZZ no está en el catálogo de Aerolíneas.");
    expect(e).toContain("«VB-21245» no es un número de vuelo: lleva la clave de la aerolínea y de 1 a 4 dígitos, como VB 2124.");
  });
  it("llegada antes de la salida, explicada en hora local de cada ciudad", () => {
    // Nocturno a Madrid sin marcar +1: llega «antes» de salir.
    const e = textos(vuelo([t("ida", "IB 6400", "MEX", "MAD", "2026-10-21", "23:55", "17:50")]), "error");
    expect(e).toEqual([
      "IB 6400: la llegada queda antes de la salida. Llega a las 05:50 PM en hora local de Madrid, que son las 09:50 AM en Ciudad de México, y sale a las 11:55 PM. Si llega otro día, se marca «+1».",
    ]);
  });
  it("llegada igual a la salida en hora real también es error", () => {
    // GDL 10:00 = CUN 11:00.
    expect(textos(vuelo([t("ida", "VB 1", "GDL", "CUN", "2026-10-21", "10:00", "11:00")]), "error")).toHaveLength(1);
  });
  it("vuelo nocturno con +1 queda bien", () => {
    const v = vuelo([t("ida", "IB 6400", "MEX", "MAD", "2026-10-21", "23:55", "17:50", 1)]);
    expect(erroresDe(v, ctx)).toEqual([]);
  });
  it("un tramo que no sale de donde llegó el anterior", () => {
    const v = vuelo([
      t("ida", "VB 1", "GDL", "MEX", "2026-10-21", "06:00", "07:30"),
      t("ida", "VB 2", "TIJ", "CUN", "2026-10-21", "10:00", "13:30"),
    ]);
    expect(textos(v, "error")).toEqual(["VB 2 sale de Tijuana (TIJ), pero VB 1 llega a Ciudad de México (MEX)."]);
  });
  it("una escala que sale antes de que llegue el tramo anterior", () => {
    const v = vuelo([
      t("ida", "VB 1", "GDL", "MEX", "2026-10-21", "06:00", "07:30"),
      t("ida", "VB 2", "MEX", "CUN", "2026-10-21", "07:00", "10:30"),
    ]);
    expect(textos(v, "error")).toEqual(["VB 2 sale antes de que llegue VB 1 a Ciudad de México (MEX)."]);
  });
  it("regreso que sale antes de que llegue la ida", () => {
    const v = vuelo([IDA(), t("regreso", "VB 2125", "CUN", "GDL", "2026-10-21", "18:00", "19:30")]);
    expect(textos(v, "error")).toEqual([
      "El regreso sale (Mié 21 oct, 06:00 PM) antes de que llegue la ida (Mié 21 oct, 08:26 PM).",
    ]);
  });
});

describe("avisos del vuelo: aparecen en «Antes de enviar»", () => {
  it("duración menor a 30 min o mayor a 20 h", () => {
    expect(textos(vuelo([t("ida", "VB 1", "CUN", "CZM", "2026-10-21", "10:00", "10:20")]), "aviso")).toContain(
      "VB 1 dura 20 min: es muy poco para un vuelo de Cancún (CUN) a Cozumel (CZM).",
    );
    expect(textos(vuelo([t("ida", "IB 1", "MEX", "MAD", "2026-10-21", "10:00", "17:00", 1)]), "aviso")).toContain(
      "IB 1 dura 23 h: pasa de 20 h. Puede faltar una escala o estar mal el día de llegada.",
    );
  });
  it("conexión corta: menos de 1 h en vuelos nacionales", () => {
    const v = vuelo([
      t("ida", "VB 1", "GDL", "MEX", "2026-10-21", "06:00", "07:30"),
      t("ida", "VB 2", "MEX", "CUN", "2026-10-21", "08:10", "11:40"),
    ]);
    expect(textos(v, "aviso")).toContain(
      "La conexión en Ciudad de México (MEX) es de 40 min. Entre dos vuelos se recomienda al menos 1 h.",
    );
  });
  it("conexión corta internacional: menos de 1 h 30", () => {
    const v = vuelo([
      t("ida", "IB 1", "MEX", "MAD", "2026-10-21", "23:55", "17:50", 1),
      t("ida", "IB 2", "MAD", "CDG", "2026-10-22", "19:05", "21:10"),
    ]);
    expect(textos(v, "aviso")).toContain(
      "La conexión en Madrid (MAD) es de 1 h 15 min. En un vuelo internacional se recomienda al menos 1 h 30 min.",
    );
    // La misma conexión en un vuelo nacional no avisa.
    const nacional = vuelo([
      t("ida", "VB 1", "GDL", "MEX", "2026-10-21", "06:00", "07:30"),
      t("ida", "VB 2", "MEX", "CUN", "2026-10-21", "08:45", "12:15"),
    ]);
    expect(textos(nacional, "aviso").filter((x) => x.includes("conexión"))).toEqual([]);
  });
  it("conexión de más de 12 h", () => {
    const v = vuelo([
      t("ida", "VB 1", "GDL", "MEX", "2026-10-21", "06:00", "07:30"),
      t("ida", "VB 2", "MEX", "CUN", "2026-10-21", "21:00", "00:30", 1),
    ]);
    expect(textos(v, "aviso")).toContain("La conexión en Ciudad de México (MEX) es de 13 h 30 min: pasa de 12 h.");
  });
  it("regreso desde otro aeropuerto y a otro aeropuerto", () => {
    const v = vuelo([IDA(), t("regreso", "VB 2125", "CZM", "MEX", "2026-10-27", "18:13", "19:45")]);
    expect(textos(v, "aviso")).toEqual([
      "El regreso sale de Cozumel (CZM) y la ida llega a Cancún (CUN).",
      "El regreso llega a Ciudad de México (MEX) y la ida sale de Guadalajara (GDL).",
    ]);
    expect(erroresDe(v, ctx)).toEqual([]);
  });
  it("vuelo fuera de las fechas del viaje", () => {
    const v = vuelo([t("ida", "VB 2124", "GDL", "CUN", "2026-10-20", "16:55", "20:26")]);
    expect(textos(v, "error")).toContain("VB 2124 vuela el Mar 20 oct, fuera de las fechas del viaje (21–27 oct).");
  });
  it("pasajeros distintos a los del viaje", () => {
    expect(textos(vuelo([IDA(), REGRESO()], { detalle: { redondo: true, pasajeros: 5 } }), "aviso")).toEqual([
      "Vuelo VB: lleva 5 pasajeros y en el viaje van 6.",
    ]);
  });
  it("la ida no llega el día del check-in o el regreso no sale el del check-out", () => {
    const h = hotel({ fechaInicio: "2026-10-22", fechaFin: "2026-10-26" });
    const avisos = revisarCotizacion([h, vuelo([IDA(), REGRESO()])], ctx).filter((x) => x.nivel === "aviso");
    expect(avisos.map((x) => x.texto)).toEqual([
      "La ida llega el Mié 21 oct y el check-in del hotel es el Jue 22 oct.",
      "El regreso sale el Mar 27 oct y el check-out del hotel es el Lun 26 oct.",
    ]);
  });
  it("con +1, el check-in se compara con el día en que llega", () => {
    const h = hotel({ fechaInicio: "2026-10-22", fechaFin: "2026-10-27" });
    const ida = t("ida", "IB 6400", "MEX", "MAD", "2026-10-21", "23:55", "17:50", 1);
    const regreso = t("regreso", "IB 6401", "MAD", "MEX", "2026-10-27", "12:00", "17:00");
    const avisos = revisarCotizacion([h, vuelo([ida, regreso])], ctx).filter((x) => x.texto.includes("check"));
    expect(avisos).toEqual([]);
  });
  it("datos incompletos no son error: faltan para enviar", () => {
    const v = vuelo([{ ...IDA(), llega: null }]);
    expect(textos(v, "falta")).toEqual(["Vuelo VB sin horario completo"]);
    expect(erroresDe(v, ctx)).toEqual([]);
  });
});

describe("duración y conexión que muestra el armador", () => {
  it("cada tramo con su duración y la conexión con el anterior", () => {
    const a = t("ida", "VB 1", "GDL", "MEX", "2026-10-21", "06:00", "07:30");
    const b = t("ida", "VB 2", "MEX", "CUN", "2026-10-21", "09:15", "12:45");
    expect(tiemposDeVuelo([a, b], AEROPUERTOS)).toEqual({
      [a.id]: { duracion: 90, conexion: null },
      [b.id]: { duracion: 150, conexion: 105 },
    });
  });
});

describe("hotel", () => {
  it("el check-out es después del check-in", () => {
    expect(textos(hotel({ fechaInicio: "2026-10-24", fechaFin: "2026-10-24" }), "error")).toEqual([
      "Seadust: la salida (Sáb 24 oct) queda el mismo día que la llegada (Sáb 24 oct). Una estancia lleva al menos una noche.",
    ]);
    expect(textos(hotel({ fechaInicio: "2026-10-24", fechaFin: "2026-10-22" }), "error")[0]).toContain("queda antes de la llegada");
  });
  it("las habitaciones suman menos personas que el viaje: aviso", () => {
    const h = hotel();
    h.habitaciones[1] = { ...h.habitaciones[1], menores: 0 };
    expect(textos(h, "aviso")).toEqual(["Seadust: las habitaciones suman 5 personas y en el viaje van 6."]);
    expect(erroresDe(h, ctx)).toEqual([]);
  });
  it("las habitaciones suman más personas que el viaje: observación neutra, sin bloquear", () => {
    const h = hotel();
    h.habitaciones[1] = { ...h.habitaciones[1], adultos: 3, menores: 3 };
    // 3 + 6 = 9 huéspedes en un viaje para 6.
    const dosPasajeros = { ...ctx, viaje: { ...ctx.viaje, adultos: 2, menores: 0, edadesMenores: [] } };
    const r = revisarPartida(h, dosPasajeros);
    expect(r.filter((x) => x.nivel === "observacion").map((x) => x.texto)).toEqual([
      "Seadust: las habitaciones suman 9 huéspedes; el viaje es para 2. Pueden sumarse más personas en destino.",
    ]);
    expect(r.filter((x) => x.nivel === "error" || x.nivel === "falta" || x.nivel === "aviso")).toEqual([]);
  });
});

describe("servicios fuera de las fechas del viaje: error", () => {
  const viaje9a15 = { ...ctx, viaje: { ...ctx.viaje, inicio: "2026-10-09", fin: "2026-10-15" } };
  it("un hotel en abril de 2027 en un viaje del 9 al 15 de octubre de 2026", () => {
    const h = hotel({ fechaInicio: "2027-04-10", fechaFin: "2027-04-14" });
    const r = revisarPartida(h, viaje9a15);
    expect(r.filter((x) => x.nivel === "error").map((x) => x.texto)).toEqual([
      "Seadust queda del Sáb 10 abr al Mié 14 abr, fuera de las fechas del viaje (9–15 oct).",
    ]);
    expect(erroresDe(h, viaje9a15)).toHaveLength(1);
  });
  it("un hotel que sale un día después del viaje", () => {
    const h = hotel({ fechaInicio: "2026-10-12", fechaFin: "2026-10-16" });
    expect(revisarPartida(h, viaje9a15).filter((x) => x.nivel === "error")).toHaveLength(1);
  });
  it("un hotel dentro del viaje no marca nada", () => {
    const h = hotel({ fechaInicio: "2026-10-09", fechaFin: "2026-10-15" });
    expect(revisarPartida(h, viaje9a15).filter((x) => x.nivel === "error")).toEqual([]);
  });
  it("un servicio con fechas fuera también se marca", () => {
    const s = { ...partidaNueva("servicio", { ...base, id: "s" }), netoTotal: 500_00, fechaInicio: "2026-11-01", fechaFin: "2026-11-05" };
    expect(revisarPartida(s, viaje9a15).filter((x) => x.nivel === "error")).toHaveLength(1);
  });
});

describe("actividades y traslados fuera del viaje", () => {
  it("una actividad fuera de las fechas es un error", () => {
    const a = { ...partidaNueva("actividad", { ...base, id: "a" }), netoTotal: 4_364_00, fechaInicio: "2026-10-28" };
    expect(textos(a, "error")).toEqual(["Xel-Há queda el Mié 28 oct, fuera de las fechas del viaje (21–27 oct)."]);
  });
  it("un traslado fuera de las fechas es un error", () => {
    const s = {
      ...partidaNueva("traslado", { ...base, id: "s" }),
      netoTotal: 2_400_00,
      detalle: { servicio: "compartido" as const, sentido: "sencillo" as const },
      trayectos: [
        { id: "x", desde: "Aeropuerto CUN", hasta: "Hotel", fecha: "2026-10-20", hora: "20:45", vueloTramoId: null, vueloFecha: null, vueloHora: null },
      ],
    };
    expect(textos(s, "error")).toEqual(["Traslado queda el Mar 20 oct, fuera de las fechas del viaje (21–27 oct)."]);
  });
});

describe("montos y fechas de pago", () => {
  it("el costo neto es mayor a cero", () => {
    expect(textos(hotel({ netoTotal: 0 }), "error")).toEqual([
      "Seadust: el costo neto total está en $0, y una cotización con un servicio sin costo no se puede enviar.",
    ]);
    expect(textos(hotel({ netoTotal: null }), "falta")).toEqual(["Seadust sin costo neto"]);
  });
  it("una fecha límite de pago en el pasado es un aviso", () => {
    expect(textos(hotel({ pagarAntes: "2026-10-09" }), "aviso")).toEqual(["Seadust: la fecha límite de pago (Vie 9 oct) ya pasó."]);
    expect(textos(hotel({ pagarAntes: "2026-10-09" }), "error")).toEqual([]);
  });
  it("una fecha de pago posterior a la llegada es un aviso, no bloquea", () => {
    expect(textos(hotel({ pagarAntes: "2026-10-22" }), "aviso")).toEqual([
      "Seadust: la fecha límite de pago (Jue 22 oct) queda después de que empieza el servicio (Mié 21 oct).",
    ]);
    expect(erroresDe(hotel({ pagarAntes: "2026-10-22" }), ctx)).toEqual([]);
  });
  it("lo mismo con la cancelación gratuita", () => {
    expect(textos(hotel({ cancelacionGratisHasta: "2026-10-01" }), "aviso")[0]).toContain("la cancelación gratuita (Jue 1 oct) ya pasó");
    expect(textos(hotel({ cancelacionGratisHasta: "2026-10-23" }), "aviso")[0]).toContain("queda después de que empieza el servicio");
    expect(textos(hotel({ cancelacionGratisHasta: "2026-10-21", pagarAntes: "2026-10-15" }), "aviso")).toEqual([]);
  });
  it("en vuelos el servicio empieza con el primer tramo", () => {
    expect(textos(vuelo([IDA(), REGRESO()], { pagarAntes: "2026-10-25" }), "aviso")).toEqual([
      "Vuelo VB: la fecha límite de pago (Dom 25 oct) queda después de que empieza el servicio (Mié 21 oct).",
    ]);
  });
});

describe("toda la cotización", () => {
  it("sin servicios no se puede enviar", () => {
    expect(revisarCotizacion([], ctx).map((h) => h.texto)).toEqual(["La cotización no tiene servicios"]);
  });
  it("faltan edades de menores o tipo de cambio", () => {
    const r = revisarCotizacion([hotel({ moneda: "EUR" })], { ...ctx, viaje: { ...ctx.viaje, edadesMenores: [8] } });
    expect(r.map((h) => h.texto)).toEqual(["Faltan edades de los menores", "Seadust en euros sin tipo de cambio"]);
  });
});

describe("traslados", () => {
  const ida: TramoArmador = { ...t("ida", "VB 2124", "GDL", "CUN", "2026-10-21", "16:55", "20:26"), id: "ida" };
  const regreso: TramoArmador = { ...t("regreso", "VB 2125", "CUN", "GDL", "2026-10-27", "18:13", "19:45"), id: "reg" };
  const conTramos = (tramos: TramoArmador[]): ContextoRevision => ({
    ...ctx,
    tramos: Object.fromEntries(tramos.map((x) => [x.id, x])),
    unidades: { van: { nombre: "Van adaptada", pasajeros: 6, maletas: 6 } },
  });
  const traslado = (c: Partial<PartidaArmador> = {}): PartidaArmador => ({
    ...partidaNueva("traslado", { ...base, id: "s" }),
    netoTotal: 2_400_00,
    trasladoUnidadId: "van",
    detalle: { servicio: "privado", sentido: "redondo", personas: 6, maletas: 6 },
    trayectos: [
      { id: "x", desde: "Aeropuerto de Cancún (CUN)", hasta: "Seadust", fecha: "2026-10-21", hora: "20:45", vueloTramoId: "ida", vueloFecha: "2026-10-21", vueloHora: "20:26" },
      { id: "y", desde: "Seadust", hasta: "Aeropuerto de Cancún (CUN)", fecha: "2026-10-27", hora: "15:30", vueloTramoId: "reg", vueloFecha: "2026-10-27", vueloHora: "18:13" },
    ],
    ...c,
  });
  const de = (p: PartidaArmador, c: ContextoRevision, nivel: string) =>
    revisarPartida(p, c).filter((h) => h.nivel === nivel).map((h) => h.texto);

  it("con el vuelo igual, no queda nada pendiente", () => {
    expect(revisarPartida(traslado(), conTramos([ida, regreso]))).toEqual([]);
  });
  it("si el vuelo cambia de horario, queda por revisar", () => {
    const tarde = { ...ida, llega: "21:40" };
    expect(de(traslado(), conTramos([tarde, regreso]), "falta")).toEqual([
      "Traslado por revisar: VB 2124 cambió de horario después de armar el traslado",
    ]);
  });
  it("si el vuelo ya no está, queda por revisar", () => {
    const sinLiga = traslado();
    sinLiga.trayectos[1] = { ...sinLiga.trayectos[1], vueloTramoId: null };
    expect(de(sinLiga, conTramos([ida]), "falta")).toEqual([
      "Traslado por revisar: el vuelo del que salió ya no está en la cotización",
    ]);
  });
  it("privado sin unidad falta; compartido no la pide", () => {
    expect(de(traslado({ trasladoUnidadId: null }), conTramos([ida, regreso]), "falta")).toEqual(["Traslado sin unidad"]);
    const compartido = traslado({ trasladoUnidadId: null, detalle: { servicio: "compartido", sentido: "redondo", personas: 6 } });
    expect(de(compartido, conTramos([ida, regreso]), "falta")).toEqual([]);
  });
  it("avisa si pasajeros o maletas exceden la unidad", () => {
    const p = traslado({ detalle: { servicio: "privado", sentido: "redondo", personas: 7, maletas: 9 } });
    expect(de(p, conTramos([ida, regreso]), "aviso")).toEqual([
      "Traslado: son 7 pasajeros y la unidad Van adaptada lleva hasta 6.",
      "Traslado: son 9 maletas y la unidad Van adaptada lleva hasta 6.",
    ]);
  });
  it("sin hora falta; el regreso antes de la ida es un error", () => {
    const p = traslado();
    p.trayectos[1] = { ...p.trayectos[1], hora: null };
    expect(de(p, conTramos([ida, regreso]), "falta")).toEqual(["Traslado sin hora"]);
    const q = traslado();
    q.trayectos[1] = { ...q.trayectos[1], fecha: "2026-10-20" };
    expect(de(q, conTramos([ida, regreso]), "error")).toContain("Traslado: el regreso (Mar 20 oct) queda antes de la ida (Mié 21 oct).");
  });
});
