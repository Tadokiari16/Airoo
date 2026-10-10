"use client";

import { useState } from "react";
import { aCentavos } from "@/lib/dinero";
import {
  COLCHONES,
  ejemploTolerancia,
  textoPorcentaje,
  tipoCambioConColchon,
  type Ajustes,
} from "@/lib/configuracion";
import {
  CampoAjuste,
  Ejemplo,
  Fijo,
  Fila,
  Seccion,
  Segmentos,
  leerNumero,
  useAvisar,
  useGuardarAjuste,
  GUARDADO,
} from "../controles";
import { guardarTipoCambioManual } from "../acciones";
import { aDiezmilesimos } from "@/lib/banxico";
import { textoTipoCambio } from "@/lib/cotizacion";

// Sin FIX guardado, el ejemplo usa el del prototipo.
const FIX_EJEMPLO = 18.42;

type Fx = { fecha: string; dia: string; diezmilesimos: number; fuente: "banxico" | "manual" } | null;

const pesos = (c: number) => (c % 100 ? (c / 100).toFixed(2) : String(c / 100));

export function Precios({
  ganancia,
  cargo,
  tolerancia,
  colchon,
  usd,
  eur,
  conBanxico,
}: {
  ganancia: Ajustes["ganancia_defecto"];
  cargo: number;
  tolerancia: number;
  colchon: number;
  usd: Fx;
  eur: Fx;
  conBanxico: boolean;
}) {
  const avisar = useAvisar();
  const fix = usd ? usd.diezmilesimos / 10_000 : FIX_EJEMPLO;
  const capturar = (moneda: "USD" | "EUR", titulo: string, actual: Fx) => (
    <Fila
      titulo={titulo}
      sub={
        actual
          ? `${actual.dia} · ${actual.fuente === "banxico" ? "de Banxico" : "capturado a mano"}`
          : "Todavía no hay ninguno guardado"
      }
      id={`fix-${moneda}`}
    >
      <CampoAjuste
        id={`fix-${moneda}`}
        valor={actual?.diezmilesimos ?? null}
        texto={(v) => (v === null ? "" : textoTipoCambio(v))}
        leer={(s) => aDiezmilesimos(s.replace(/[$\s]/g, ""))}
        prefijo="$"
        alGuardar={async (v) => {
          if (v === null) return { error: "Falta el tipo de cambio." };
          const r = await guardarTipoCambioManual(moneda, v);
          if ("ok" in r) avisar(GUARDADO);
          return r;
        }}
      />
    </Fila>
  );
  const guardar = useGuardarAjuste();
  const [limite, setLimite] = useState(tolerancia);
  const [fx, setFx] = useState(colchon);
  const pct = (clave: keyof typeof ganancia, titulo: string, sub: string) => (
    <Fila titulo={titulo} sub={sub} id={`ganancia-${clave}`}>
      <CampoAjuste
        id={`ganancia-${clave}`}
        valor={ganancia[clave]}
        texto={(v) => String(Number(v.toFixed(2)))}
        leer={leerNumero}
        sufijo="%"
        alGuardar={(v) => guardar("ganancia_defecto", { ...ganancia, [clave]: v })}
      />
    </Fila>
  );

  return (
    <div className="flex flex-col gap-4">
      <Seccion
        titulo="Ganancia por defecto"
        sub="El armador la propone al agregar un servicio; se puede cambiar en cada uno."
      >
        {pct("hoteles", "Hoteles", "Sobre el neto de la plataforma")}
        {pct("actividades", "Actividades y traslados", "Sobre el neto del proveedor")}
        {pct("vuelos", "Vuelos", "Se compran directo con la aerolínea")}
        <Fila titulo="Cargo por servicio" sub="Por viaje · no reembolsable al cancelar" id="cargo-servicio">
          <CampoAjuste
            id="cargo-servicio"
            valor={cargo}
            texto={pesos}
            leer={aCentavos}
            prefijo="$"
            alGuardar={(c) => guardar("cargo_servicio", { centavos: c, moneda: "MXN", por: "viaje" })}
          />
        </Fila>
        <Fila titulo="IVA" sub="Los precios no lo llevan">
          <Segmentos
            etiqueta="IVA"
            opciones={[{ valor: "solo_factura", etiqueta: "Solo si pide factura" }]}
            valor="solo_factura"
          />
        </Fila>
      </Seccion>

      <Seccion
        titulo="Cuando un precio cambia al validar"
        sub="Hasta cuánto absorbe Airoo sin avisarle al cliente. Arriba de eso, se le manda la versión 2."
      >
        <Fila titulo="Tolerancia" sub="Monto fijo por servicio: igual para un traslado que para un hotel">
          <Fijo>Monto fijo</Fijo>
        </Fila>
        <Fila titulo="Límite" sub="Por servicio" id="tolerancia">
          <CampoAjuste
            id="tolerancia"
            valor={tolerancia}
            texto={pesos}
            leer={aCentavos}
            prefijo="$"
            alGuardar={async (c) => {
              const r = await guardar("tolerancia_precio", { centavos: c, moneda: "MXN", por: "servicio" });
              if ("ok" in r) setLimite(c);
              return r;
            }}
          />
        </Fila>
        <Ejemplo>{ejemploTolerancia(limite)}</Ejemplo>
      </Seccion>

      <Seccion
        titulo="Tipo de cambio"
        sub="Para tarifas en dólares o euros. Se guarda con fecha en cada cotización."
      >
        <Fila titulo="Base" sub="Publicado por Banxico cada día hábil">
          <Segmentos
            etiqueta="Base del tipo de cambio"
            opciones={[{ valor: "fix", etiqueta: "FIX de Banxico" }]}
            valor="fix"
          />
        </Fila>
        <Fila titulo="Colchón" sub="Por si sube entre la cotización y el pago">
          <Segmentos
            etiqueta="Colchón"
            opciones={COLCHONES.map((v) => ({ valor: v as number, etiqueta: textoPorcentaje(v) }))}
            valor={colchon}
            alElegir={async (v) => {
              setFx(v);
              const r = await guardar("colchon_tipo_cambio", { porcentaje: v });
              if ("error" in r) setFx(colchon);
              return r;
            }}
          />
        </Fila>
        {capturar("USD", "Dólar de hoy", usd)}
        {capturar("EUR", "Euro de hoy", eur)}
        <Ejemplo>
          {conBanxico
            ? "Se trae de Banxico cada día hábil después de que lo publica. Si no llega, se puede capturar aquí. "
            : "Todavía no hay conexión con Banxico: el tipo de cambio de cada día se captura aquí. "}
          Ejemplo: FIX <b className="num">{fix.toFixed(2)}</b> + {textoPorcentaje(fx)} ={" "}
          <b className="num">{tipoCambioConColchon(fix, fx)}</b> por dólar. El cliente ve el precio en
          pesos con la etiqueta «Tarifa en USD».
        </Ejemplo>
      </Seccion>
    </div>
  );
}
