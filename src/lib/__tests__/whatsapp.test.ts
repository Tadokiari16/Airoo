import { describe, expect, it } from "vitest";
import { ligaWhatsApp } from "../whatsapp";

describe("ligas de WhatsApp", () => {
  it("arma la liga wa.me con lada", () => {
    expect(ligaWhatsApp("+52 998 214 7730")).toBe("https://wa.me/529982147730");
    expect(ligaWhatsApp("998 214 7730")).toBe("https://wa.me/529982147730");
  });
  it("lleva el mensaje escrito", () => {
    expect(ligaWhatsApp("+52 998 214 7730", "Hola")).toBe("https://wa.me/529982147730?text=Hola");
  });
  it("descarta lo que no es teléfono", () => {
    expect(ligaWhatsApp("1234")).toBeNull();
  });
});
