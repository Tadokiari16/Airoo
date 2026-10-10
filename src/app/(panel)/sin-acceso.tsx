import { Tarjeta, Vacio } from "@/components/ui/tarjeta";

export function SinAcceso() {
  return (
    <Tarjeta className="mt-8">
      <Vacio titulo="Esta sección no está disponible para tu rol">
        El dueño decide qué ve cada persona del equipo en Configuración › Equipo y permisos.
      </Vacio>
    </Tarjeta>
  );
}
