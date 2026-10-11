import { describe, expect, it } from "vitest";
import {
  agrupar,
  clabeValida,
  enmascarar,
  errorNumeroCuenta,
  listaParaAprobar,
  tarjetaValida,
  telefonoParaConfirmar,
} from "../cuentas";

describe("CLABE y tarjeta", () => {
  it("revisa el dígito verificador de la CLABE", () => {
    expect(clabeValida("032180000118359719")).toBe(true);
    expect(clabeValida("032180000118359718")).toBe(false);
    expect(clabeValida("0321800001183597")).toBe(false);
  });
  it("revisa la tarjeta con Luhn", () => {
    expect(tarjetaValida("4111 1111 1111 1111")).toBe(true);
    expect(tarjetaValida("4111 1111 1111 1112")).toBe(false);
  });
  it("explica por qué un número no sirve", () => {
    expect(errorNumeroCuenta("clabe", "1234")).toBe("La CLABE lleva 18 dígitos; esta tiene 4.");
    expect(errorNumeroCuenta("clabe", "032180000118359719")).toBeNull();
    expect(errorNumeroCuenta("tarjeta", "4111111111111111")).toBeNull();
  });
  it("enmascara y agrupa", () => {
    expect(enmascarar("8812")).toBe("••8812");
    expect(agrupar("5204165033188812")).toBe("5204 1650 3318 8812");
  });
});

describe("verificación de cuentas nuevas", () => {
  it("solo se aprueba con la llamada y el estado de cuenta", () => {
    expect(listaParaAprobar({ confirmoPorTelefono: true, estadoCuentaCoincide: true })).toBe(true);
    expect(listaParaAprobar({ confirmoPorTelefono: true, estadoCuentaCoincide: false })).toBe(false);
    expect(listaParaAprobar({ confirmoPorTelefono: false, estadoCuentaCoincide: true })).toBe(false);
  });
  it("se llama al número que ya estaba registrado", () => {
    const contactos = [
      { whatsapp: "+52 998 000 0002", principal: false },
      { whatsapp: "+52 998 000 0001", principal: true },
    ];
    expect(telefonoParaConfirmar({ telefonoLlamada: "998 214 7730" }, contactos)).toBe("998 214 7730");
    expect(telefonoParaConfirmar(null, contactos)).toBe("+52 998 000 0001");
    expect(telefonoParaConfirmar(null, [])).toBeNull();
  });
});
