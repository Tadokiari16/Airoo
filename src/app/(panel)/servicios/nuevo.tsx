"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { MODELO_SUGERIDO, modelo, TIPOS_ALTA, type TipoServicio } from "@/lib/servicios";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { Opciones } from "@/components/catalogo/lista";
import { crearServicio, type ResultadoAlta } from "./acciones";

/** Alta corta: nombre, tipo y destino. Lo demás va en la ficha. */
export function NuevoServicio({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const [vez, setVez] = useState(0);
  const cerrar = () => {
    setVez((v) => v + 1);
    alCerrar();
  };
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Nuevo servicio"
      sub="Nombre, tipo y destino; lo demás va en la ficha."
      ancho={560}
    >
      <Formulario key={vez} alCancelar={cerrar} />
    </Dialogo>
  );
}

function Formulario({ alCancelar }: { alCancelar: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [destino, setDestino] = useState("");
  const [tipo, setTipo] = useState<TipoServicio>("seguro");
  const [estado, accion, pendiente] = useActionState(async (prev: ResultadoAlta, f: FormData) => {
    const r = await crearServicio(prev, f);
    if (r && "id" in r) router.push(`/servicios/${r.id}?nuevo=1`);
    return r;
  }, undefined);

  return (
    <form onSubmit={enviarSinVaciar(accion)} className="flex flex-col gap-4">
      <input type="hidden" name="tipo" value={tipo} />
      <Campo
        etiqueta="Nombre"
        name="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. Seguro de viaje"
        autoFocus
        autoComplete="off"
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Tipo</span>
        <Opciones
          etiqueta="Tipo"
          opciones={TIPOS_ALTA.map((t) => ({ valor: t.valor, etiqueta: t.nombre }))}
          elegidas={[tipo]}
          alCambiar={([t]) => setTipo(t)}
        />
        <p className="text-[12.5px] text-tinta-3">
          La forma de cobrar y los campos dependen del tipo. Para{" "}
          {TIPOS_ALTA.find((t) => t.valor === tipo)!.nombre.toLowerCase()} se empieza con «
          {modelo(MODELO_SUGERIDO[tipo]).nombre.toLowerCase()}», que se cambia en la ficha. El tipo queda fijo
          al crear el servicio. Los traslados están en su propio catálogo.
        </p>
      </div>
      <Campo
        etiqueta="Destino"
        name="destino"
        value={destino}
        onChange={(e) => setDestino(e.target.value)}
        placeholder="Ej. Cancún y Riviera Maya"
        ayuda="Dónde aplica, en texto libre: una ciudad, una región o «Cualquier destino»."
        autoComplete="off"
      />

      {estado && "parecidos" in estado ? (
        <div role="alert" className="rounded-xl bg-ambar-tenue px-3.5 py-3 text-[13.5px]">
          <p className="font-semibold">
            Ya hay {estado.parecidos.length === 1 ? "un servicio" : "servicios"} con nombre parecido:
          </p>
          <ul className="mt-1 list-disc pl-5 text-tinta-2">
            {estado.parecidos.map((p) => (
              <li key={p.id}>
                <a href={`/servicios/${p.id}`} className="font-semibold text-azul-oscuro hover:underline">
                  {p.nombre}
                </a>{" "}
                · {p.destino}
                {p.archivado ? " · archivado" : ""}
              </li>
            ))}
          </ul>
          <input type="hidden" name="confirmar" value="si" />
        </div>
      ) : null}
      {estado && "error" in estado ? (
        <p role="alert" className="text-[13px] text-rojo">
          {estado.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Boton variante="secundario" className="h-10" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" disabled={pendiente || !nombre.trim() || !destino.trim()}>
          {estado && "parecidos" in estado ? "Crear de todos modos" : "Crear y abrir ficha"}
        </Boton>
      </div>
    </form>
  );
}
