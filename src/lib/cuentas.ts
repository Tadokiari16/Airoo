// Reglas de las cuentas donde reciben los proveedores. Sin acceso a la base,
// para poder probarlas solas.

export type TipoCuenta = "clabe" | "tarjeta";

export const NOMBRE_TIPO_CUENTA: Record<TipoCuenta, string> = { clabe: "CLABE", tarjeta: "Tarjeta" };

export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Dígito verificador de la CLABE: pesos 3, 7, 1 sobre los primeros 17 dígitos. */
export function clabeValida(clabe: string): boolean {
  const d = soloDigitos(clabe);
  if (d.length !== 18) return false;
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += (Number(d[i]) * pesos[i % 3]) % 10;
  return (10 - (suma % 10)) % 10 === Number(d[17]);
}

/** Tarjeta de 15 o 16 dígitos con dígito de Luhn. */
export function tarjetaValida(numero: string): boolean {
  const d = soloDigitos(numero);
  if (d.length < 15 || d.length > 16) return false;
  let suma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
  }
  return suma % 10 === 0;
}

/** Revisa el número según el tipo. Devuelve el texto del error o null. */
export function errorNumeroCuenta(tipo: TipoCuenta, numero: string): string | null {
  const d = soloDigitos(numero);
  if (tipo === "clabe") {
    if (d.length !== 18) return `La CLABE lleva 18 dígitos; esta tiene ${d.length}.`;
    if (!clabeValida(d)) return "El último dígito de la CLABE no coincide; puede haber un número cambiado.";
    return null;
  }
  if (d.length < 15 || d.length > 16) return `La tarjeta lleva 16 dígitos; esta tiene ${d.length}.`;
  if (!tarjetaValida(d)) return "El número de tarjeta no es válido; puede haber un número cambiado.";
  return null;
}

/** «••8812»: lo único que ve quien no puede ver la cuenta completa. */
export function enmascarar(ultimos4: string): string {
  return "••" + ultimos4;
}

/** Agrupa para leerla sin errores: «0126 9100 4588 2201 34» o «5204 1650 3318 8812». */
export function agrupar(numero: string): string {
  return soloDigitos(numero).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/**
 * La cuenta nueva solo se aprueba con las dos casillas: la llamada al número
 * que ya estaba registrado y el estado de cuenta a nombre del titular.
 */
export function listaParaAprobar(v: {
  confirmoPorTelefono: boolean;
  estadoCuentaCoincide: boolean;
}): boolean {
  return v.confirmoPorTelefono && v.estadoCuentaCoincide;
}

/**
 * A qué número se llama para confirmar: el de la cuenta anterior si la hay;
 * si no, el WhatsApp del contacto principal o el de cualquier contacto.
 * Nunca un número que venga con la solicitud de cambio.
 */
export function telefonoParaConfirmar(
  anterior: { telefonoLlamada: string | null } | null,
  contactos: { whatsapp: string | null; principal: boolean }[],
): string | null {
  if (anterior?.telefonoLlamada) return anterior.telefonoLlamada;
  const principal = contactos.find((c) => c.principal && c.whatsapp);
  return principal?.whatsapp ?? contactos.find((c) => c.whatsapp)?.whatsapp ?? null;
}
