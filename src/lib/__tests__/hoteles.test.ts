import { describe, expect, it } from "vitest";
import {
  bolitas,
  horaCliente,
  idTripadvisor,
  revisarFicha,
  textoCargo,
  textoFicha,
  type ResumenFicha,
} from "../hoteles";

const completa: ResumenFicha = {
  portada: { ancho: 2400, alto: 1350 },
  fotosGaleria: 8,
  descripcion: "En el km 16.5 de la Zona Hotelera.",
  direccion: "Blvd. Kukulcán km 16.5",
  ligaMaps: "https://maps.app.goo.gl/x",
  habitaciones: [
    { fotos: 3 },
    { fotos: 1 },
  ],
  tripadvisorId: "1234517",
  tripadvisorCalificacion: 45,
  cargos: 1,
  sinCargos: false,
  telefonoReservaciones: "+52 998 100 0100",
  correoReservaciones: null,
};

describe("ficha del hotel", () => {
  it("una ficha con todo marca 8 de 8", () => {
    const r = revisarFicha(completa);
    expect(r).toHaveLength(8);
    expect(r.every((x) => x.ok)).toBe(true);
    expect(textoFicha(r)).toBe("Completa");
  });
  it("los nombres que usa cada plataforma ya no son parte de la ficha", () => {
    expect(revisarFicha(completa).map((x) => x.nombre)).not.toContain("Nombres en plataformas");
  });
  it("una portada cuadrada queda por ajustar", () => {
    const r = revisarFicha({ ...completa, portada: { ancho: 1080, alto: 1080 } });
    expect(r[0]).toMatchObject({ ok: false, valor: "por ajustar" });
    expect(textoFicha(r)).toBe("Portada por ajustar");
  });
  it("cuenta las habitaciones sin fotos", () => {
    const r = revisarFicha({
      ...completa,
      habitaciones: [...completa.habitaciones, { fotos: 0 }],
    });
    expect(r.find((x) => x.clave === "fotos_hab")).toMatchObject({ ok: false, valor: "2 de 3" });
  });
  it("un hotel que no cobra cargos aparte no queda pendiente", () => {
    expect(revisarFicha({ ...completa, cargos: 0 }).find((x) => x.clave === "cargos")?.ok).toBe(false);
    expect(
      revisarFicha({ ...completa, cargos: 0, sinCargos: true }).find((x) => x.clave === "cargos")?.ok,
    ).toBe(true);
  });
  it("con lo mínimo dice cuántas cosas faltan", () => {
    const r = revisarFicha({
      ...completa,
      portada: null,
      fotosGaleria: 0,
      descripcion: null,
      direccion: null,
      ligaMaps: null,
      habitaciones: [],
      tripadvisorId: null,
      tripadvisorCalificacion: null,
      cargos: 0,
      telefonoReservaciones: null,
    });
    expect(textoFicha(r)).toBe("Faltan 8 cosas");
  });
  it("con 2 fotos explica cuántas conviene tener", () => {
    expect(revisarFicha({ ...completa, fotosGaleria: 2 })[1].falta).toBe(
      "Tiene 2 fotos; la propuesta se ve mejor con 5",
    );
  });
});

describe("textos del hotel", () => {
  it("los cargos llevan su moneda", () => {
    expect(textoCargo({ montoCentavos: 6900, moneda: "MXN", seCobra: "habitacion_noche" })).toBe(
      "$69 por habitación por noche",
    );
    expect(textoCargo({ montoCentavos: 250, moneda: "EUR", seCobra: "persona_noche" })).toBe(
      "€2.50 por persona por noche",
    );
  });
  it("las horas se muestran como en los prototipos", () => {
    expect(horaCliente("15:00:00")).toBe("3:00 PM");
    expect(horaCliente("12:00")).toBe("12:00 PM");
    expect(horaCliente("00:30")).toBe("12:30 AM");
    expect(horaCliente(null)).toBe("");
  });
  it("lee el ID de Tripadvisor del número o de la dirección", () => {
    expect(idTripadvisor("1234517")).toBe("1234517");
    expect(
      idTripadvisor("https://www.tripadvisor.com.mx/Hotel_Review-g150807-d1234517-Reviews-Seadust.html"),
    ).toBe("1234517");
    expect(idTripadvisor("seadust")).toBeNull();
  });
  it("las bolitas de 4.5 son cuatro llenas y una media", () => {
    expect(bolitas(45)).toEqual(["llena", "llena", "llena", "llena", "media"]);
  });
});
