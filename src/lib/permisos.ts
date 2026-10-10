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
  | "editar_catalogos" // agregar y editar hoteles, actividades, servicios, aerolíneas y proveedores
  | "archivar_catalogos" // archivar y reactivar
  | "eliminar_catalogos" // eliminar (solo si nunca se usó) y unir duplicados
  | "cuentas_proveedor" // agregar, aprobar o rechazar dónde recibe un proveedor
  | "ver_cuenta_completa" // ver y copiar el número completo de una cuenta de proveedor
  | "ver_viajes" // lista de viajes y resumen de cada uno
  | "editar_todos_los_viajes" // armar y enviar cotizaciones de cualquier viaje, y cambiar quién lo atiende
  | "capturar_tipo_cambio"; // el FIX a mano cuando no llega de Banxico

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
    "archivar_catalogos",
    "eliminar_catalogos",
    "cuentas_proveedor",
    "ver_cuenta_completa",
    "ver_viajes",
    "editar_todos_los_viajes",
    "capturar_tipo_cambio",
  ],
  asesora: [
    "cotizar",
    "confirmar_pagos",
    "ver_catalogos",
    "ver_proveedores",
    "editar_catalogos",
    "archivar_catalogos",
    "ver_viajes",
  ],
  contador: ["confirmar_pagos", "ver_finanzas", "ver_proveedores", "ver_cuenta_completa", "ver_viajes"],
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

/**
 * Armar y enviar la cotización de un viaje: el Dueño, todos; la asesora, solo
 * los suyos (sin costos ajenos no puede usar el armador); el Contador, ninguno.
 */
export function puedeEditarViaje(rol: Rol, usuarioId: string, aCargoId: string | null): boolean {
  if (puede(rol, "editar_todos_los_viajes")) return true;
  return puede(rol, "cotizar") && aCargoId === usuarioId;
}
