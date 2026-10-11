"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { enviarSinVaciar } from "@/components/ui/enviar";
import { IconoAtras, IconoPalomita } from "@/components/iconos";
import { ElegirCiudad } from "@/components/catalogo/elegir-ciudad";
import type { OpcionCiudad } from "./datos";
import { crearHotel, type ResultadoAlta } from "./acciones";

type Paso = "como" | "manual";

/**
 * Alta de hotel: nombre y ciudad. Solo con una conexión de importación
 * encendida en Configuración se pregunta antes cómo darlo de alta.
 */
export function NuevoHotel({
  abierto,
  alCerrar,
  ciudades,
  agregaCiudades,
  importar,
}: {
  abierto: boolean;
  alCerrar: () => void;
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
  importar: boolean;
}) {
  const inicial: Paso = importar ? "como" : "manual";
  const [paso, setPaso] = useState<Paso>(inicial);
  const [forma, setForma] = useState<"manual" | null>(null);
  const cerrar = () => {
    setPaso(inicial);
    setForma(null);
    alCerrar();
  };
  return (
    <Dialogo
      abierto={abierto}
      alCerrar={cerrar}
      titulo={paso === "manual" && importar ? "Nuevo hotel · captura manual" : "Nuevo hotel"}
      sub={paso === "manual" ? "Nombre y ciudad; lo demás va en la ficha." : "¿Cómo lo quieres dar de alta?"}
      ancho={560}
    >
      {paso === "como" ? (
        <>
          <div className="flex flex-col gap-2.5">
            <Forma
              elegida={forma === "manual"}
              alElegir={() => setForma("manual")}
              titulo="Captura manual"
              texto="Se empieza con nombre y ciudad; lo demás se completa en la ficha. Sirve para cualquier hotel, también los de trato directo."
            />
            <Forma
              deshabilitada
              titulo="Importar desde un proveedor"
              texto="Con el ID que tiene el hotel en el proveedor se traen nombre, fotos, horarios y habitaciones."
            >
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["RateHawk", "TBO Holidays"].map((p) => (
                  <span
                    key={p}
                    className="inline-flex h-6 items-center gap-1.5 rounded-md bg-suave px-2 text-[12px] font-semibold text-tinta-2"
                  >
                    {p} <span className="font-medium text-tinta-3">· Sin conexión</span>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-tinta-3">
                Ningún proveedor está conectado todavía. La importación queda como conexión opcional para más
                adelante.
              </p>
            </Forma>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Boton variante="secundario" onClick={cerrar}>
              Cancelar
            </Boton>
            <Boton disabled={!forma} onClick={() => setPaso("manual")}>
              Continuar
            </Boton>
          </div>
        </>
      ) : (
        <CapturaManual
          ciudades={ciudades}
          agregaCiudades={agregaCiudades}
          alRegresar={importar ? () => setPaso("como") : undefined}
          alCancelar={cerrar}
        />
      )}
    </Dialogo>
  );
}

function Forma({
  titulo,
  texto,
  elegida,
  alElegir,
  deshabilitada,
  children,
}: {
  titulo: string;
  texto: string;
  elegida?: boolean;
  alElegir?: () => void;
  deshabilitada?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!elegida}
      aria-disabled={deshabilitada}
      onClick={deshabilitada ? undefined : alElegir}
      className={`flex gap-3 rounded-[14px] p-3.5 text-left ${deshabilitada ? "cursor-not-allowed bg-suave/60 shadow-borde" : "cursor-pointer"} ${elegida ? "bg-azul-tenue shadow-[inset_0_0_0_1.5px_var(--color-azul)]" : deshabilitada ? "" : "shadow-borde hover:bg-suave"}`}
    >
      <span
        className={`mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-full ${elegida ? "bg-azul text-white" : "shadow-[inset_0_0_0_1.5px_var(--color-linea)]"}`}
      >
        {elegida ? <IconoPalomita tam={12} strokeWidth={3} /> : null}
      </span>
      <span className={deshabilitada ? "opacity-70" : ""}>
        <b className="block text-[14.5px] font-semibold">{titulo}</b>
        <span className="text-[13px] text-tinta-2">{texto}</span>
        {children}
      </span>
    </button>
  );
}

function CapturaManual({
  ciudades,
  agregaCiudades,
  alRegresar,
  alCancelar,
}: {
  ciudades: OpcionCiudad[];
  agregaCiudades: boolean;
  alRegresar?: () => void;
  alCancelar: () => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ciudadId, setCiudadId] = useState("");
  const [estado, accion, pendiente] = useActionState(async (prev: ResultadoAlta, f: FormData) => {
    const r = await crearHotel(prev, f);
    if (r && "id" in r) router.push(`/hoteles/${r.id}?nuevo=1`);
    return r;
  }, undefined);

  return (
    <form onSubmit={enviarSinVaciar(accion)} className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre"
        name="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. Casa Mexicana San Cristóbal"
        autoFocus
        autoComplete="off"
      />
      <ElegirCiudad
        ciudades={ciudades}
        agregaCiudades={agregaCiudades}
        valor={ciudadId}
        alCambiar={setCiudadId}
      />

      <p className="text-[13px] text-tinta-2">
        Al crearlo se abre su ficha: portada, galería, habitaciones, dirección, Tripadvisor y dónde se puede
        reservar. Nada de eso es obligatorio para empezar a cotizarlo; la ficha marca lo que falta.
      </p>

      {estado && "parecidos" in estado ? (
        <div role="alert" className="rounded-xl bg-ambar-tenue px-3.5 py-3 text-[13.5px]">
          <p className="font-semibold">
            Ya hay {estado.parecidos.length === 1 ? "un hotel" : "hoteles"} con nombre parecido:
          </p>
          <ul className="mt-1 list-disc pl-5 text-tinta-2">
            {estado.parecidos.map((p) => (
              <li key={p.id}>
                <a href={`/hoteles/${p.id}`} className="font-semibold text-azul-oscuro hover:underline">
                  {p.nombre}
                </a>{" "}
                · {p.ciudad}
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

      <div className="flex items-center gap-2">
        {alRegresar ? (
          <Boton variante="texto" onClick={alRegresar} className="gap-1">
            <IconoAtras tam={15} /> Cambiar forma de alta
          </Boton>
        ) : null}
        <Boton variante="secundario" className="ml-auto h-10" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" disabled={pendiente || !nombre.trim() || !ciudadId}>
          {estado && "parecidos" in estado ? "Crear de todos modos" : "Crear y abrir ficha"}
        </Boton>
      </div>
    </form>
  );
}
