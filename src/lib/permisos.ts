// Qué puede hacer cada rol. Sale de la tabla «Qué puede hacer cada rol» del
// prototipo de Configuración y de las reglas de CLAUDE.md. Es el único lugar
// donde se decide; las pantallas y las acciones del servidor preguntan aquí.

export const ROLES = ["dueno", "asesora", "contador"] as const;
export type Rol = (typeof ROLES)[number];

export const NOMBRE_ROL: Record<Rol, string> = {
  dueno: "Dueño",
  asesora: "Asesora",
  contador: "Contador",
};

export type Permiso =
  | "cotizar" // cotizar, enviar y reservar
  | "confirmar_pagos" // confirmar pagos de clientes
  | "cancelar_viajes" // cancelar viajes y reembolsar
  | "ver_finanzas"
  | "cambiar_cuentas" // cuentas para recibir pagos
  | "configuracion" // configuración, equipo, ciudades y bitácora
  | "ver_catalogos" // hoteles, actividades, servicios y aerolíneas
  | "ver_proveedores"
  | "editar_catalogos";

const MATRIZ: Record<Rol, readonly Permiso[]> = {
  dueno: [
    "cotizar",
    "confirmar_pagos",
    "cancelar_viajes",
    "ver_finanzas",
    "cambiar_cuentas",
    "configuracion",
    "ver_catalogos",
    "ver_proveedores",
    "editar_catalogos",
  ],
  asesora: ["cotizar", "confirmar_pagos", "ver_catalogos", "ver_proveedores", "editar_catalogos"],
  contador: ["confirmar_pagos", "ver_finanzas", "ver_proveedores"],
};

export function puede(rol: Rol, permiso: Permiso): boolean {
  return MATRIZ[rol].includes(permiso);
}

/**
 * Costos y utilidad: la asesora ve todos los viajes, pero los costos solo de
 * los suyos. Dueño y Contador los ven todos.
 */
export function puedeVerCostos(rol: Rol, usuarioId: string, aCargoId: string | null): boolean {
  if (rol === "asesora") return aCargoId === usuarioId;
  return true;
}

/** Texto que aparece debajo del nombre en «Tu cuenta». */
export function etiquetaCuenta(rol: Rol): string {
  return rol === "dueno" ? "Administrador" : NOMBRE_ROL[rol];
}
