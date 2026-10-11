import { startTransition, type FormEvent } from "react";

/**
 * Envía el formulario a una acción sin que React lo vacíe al terminar: con
 * `<form action>` los campos se borran aunque la acción devuelva un error.
 */
export function enviarSinVaciar(accion: (datos: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };
}
