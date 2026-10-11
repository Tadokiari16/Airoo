"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { TIPOS, type TipoActividad } from "@/lib/actividades";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { Opciones } from "@/components/catalogo/lista";
import { ElegirCiudad, type OpcionCiudad } from "@/components/catalogo/elegir-ciudad";
import { crearActividad, type ResultadoAlta } from "./acciones";

/** Alta corta: nombre, ciudad y tipo. Lo demás va en la ficha. */
export function NuevaActividad({
  abierto,
  alCerrar,
  ciudades,
  agregaCiudades,
}: {
  abierto: boolean;
  alCerrar: () => void;
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
}) {
  const [vez, setVez] = useState(0);
  const cerrar = () => {
    setVez((v) => v + 1);
    alCerrar();
  };
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Nueva actividad"
      sub="Nombre, ciudad y tipo; lo demás va en la ficha."
      ancho={560}
    >
      <Formulario key={vez} ciudades={ciudades} agregaCiudades={agregaCiudades} alCancelar={cerrar} />
    </Dialogo>
  );
}

function Formulario({
  ciudades,
  agregaCiudades,
  alCancelar,
}: {
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
  alCancelar: () => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ciudadId, setCiudadId] = useState("");
  const [tipo, setTipo] = useState<TipoActividad>("tour");
  const [estado, accion, pendiente] = useActionState(async (prev: ResultadoAlta, f: FormData) => {
    const r = await crearActividad(prev, f);
    if (r && "id" in r) router.push(`/actividades/${r.id}?nueva=1`);
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
        placeholder="Ej. Tour de 3 islas"
        autoFocus
        autoComplete="off"
      />
      <ElegirCiudad
        ciudades={ciudades}
        agregaCiudades={agregaCiudades}
        valor={ciudadId}
        alCambiar={setCiudadId}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Tipo</span>
        <Opciones
          etiqueta="Tipo"
          opciones={TIPOS.map((t) => ({ valor: t.valor, etiqueta: t.nombre }))}
          elegidas={[tipo]}
          alCambiar={([t]) => setTipo(t)}
        />
        <p className="text-[12.5px] text-tinta-3">
          El tipo enciende en la ficha los bloques que suele necesitar (planes, boletos por edad, horarios,
          recogida…). Se pueden prender o apagar.
        </p>
      </div>

      {estado && "parecidos" in estado ? (
        <div role="alert" className="rounded-xl bg-ambar-tenue px-3.5 py-3 text-[13.5px]">
          <p className="font-semibold">
            Ya hay {estado.parecidos.length === 1 ? "una actividad" : "actividades"} con nombre parecido:
          </p>
          <ul className="mt-1 list-disc pl-5 text-tinta-2">
            {estado.parecidos.map((p) => (
              <li key={p.id}>
                <a href={`/actividades/${p.id}`} className="font-semibold text-azul-oscuro hover:underline">
                  {p.nombre}
                </a>{" "}
                · {p.ciudad}
                {p.archivado ? " · archivada" : ""}
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
        <Boton type="submit" disabled={pendiente || !nombre.trim() || !ciudadId}>
          {estado && "parecidos" in estado ? "Crear de todos modos" : "Crear y abrir ficha"}
        </Boton>
      </div>
    </form>
  );
}
