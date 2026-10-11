"use client";

import { MARGENES, tipoCambioDe, type FixCotizacion, type PartidaArmador } from "@/lib/armador";
import { precioPorPersona, textoPorcentaje, textoTipoCambio, type Calculo } from "@/lib/cotizacion";
import { formatoDinero, MONEDAS, type Moneda } from "@/lib/dinero";
import { formatoDia } from "@/lib/fechas";
import type { ProveedorOpcion } from "./datos";
import { CAJA, CampoDinero, Etiqueta, OjoTachado, Segmentos } from "./piezas";

const PAGOS = [
  { valor: "al_reservar", etiqueta: "Al reservar" },
  { valor: "anticipo", etiqueta: "Anticipo" },
  { valor: "en_el_lugar", etiqueta: "En el lugar" },
] as const;

const NOMBRE_MONEDA: Record<Moneda, string> = { MXN: "peso", USD: "dólar", EUR: "euro" };

/**
 * El panel derecho de cada servicio: costo neto total, dónde se reserva, moneda,
 * utilidad, cómo se le paga al proveedor, precio y ganancia.
 */
export function PanelPrecio({
  p,
  calc,
  fx,
  fixHoy,
  personas,
  sinBebes = false,
  utilidadBasePb,
  utilidadFijaPb,
  proveedores,
  directo,
  alCambiar,
  alElegirProveedor,
}: {
  p: PartidaArmador;
  calc: Calculo;
  fx: FixCotizacion;
  fixHoy: { usd: number | null; eur: number | null; fecha: string | null };
  personas: number;
  sinBebes?: boolean;
  utilidadBasePb: number;
  /** Vuelos: la utilidad es fija por política. */
  utilidadFijaPb?: number;
  proveedores: ProveedorOpcion[];
  /** Cómo se llama reservar sin proveedor: «Directo», «Directo con el hotel». */
  directo: string | null;
  alCambiar: (cambio: Partial<PartidaArmador>) => void;
  alElegirProveedor: (id: string | null) => void;
}) {
  const tc = tipoCambioDe(p.moneda, fx);
  const fixDeHoy = p.moneda === "USD" ? fixHoy.usd : p.moneda === "EUR" ? fixHoy.eur : null;
  const anticipo = calc.netoMxn !== null ? calc.netoMxn - calc.enDestino : null;
  const pp = (c: number | null) => {
    const v = c !== null ? precioPorPersona(c, personas) : null;
    return v !== null ? `${formatoDinero(v)} por persona${sinBebes ? " sin contar bebés" : ""}` : "";
  };

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-suave/70 p-3.5 shadow-borde">
      <Fila
        etiqueta={
          <>
            <OjoTachado /> Costo neto total
          </>
        }
      >
        <CampoDinero
          etiqueta="Costo neto total"
          valor={p.netoTotal}
          moneda={p.moneda}
          ambar
          className="w-[150px]"
          alCambiar={(c) => alCambiar({ netoTotal: c })}
        />
      </Fila>
      <p className="-mt-2 text-right text-[11.5px] text-tinta-3">Lo que cobra el proveedor por todo el servicio.</p>

      <Fila etiqueta="Moneda">
        <div className="w-[150px]">
          <Segmentos
            chico
            etiqueta="Moneda de la tarifa"
            opciones={MONEDAS.map((m) => ({ valor: m, etiqueta: m }))}
            valor={p.moneda}
            alCambiar={(m) => alCambiar({ moneda: m })}
          />
        </div>
      </Fila>
      {p.moneda !== "MXN" ? (
        <p className="-mt-1.5 text-[11.5px] leading-snug text-tinta-3">
          {tc
            ? `${calc.neto !== null ? `${formatoDinero(calc.neto, p.moneda)} · ` : ""}${textoTipoCambio(tc)} por ${NOMBRE_MONEDA[p.moneda]}${calc.netoMxn !== null ? ` = ${formatoDinero(calc.netoMxn)}` : ""}. FIX con colchón, guardado en esta cotización.`
            : fixDeHoy
              ? `FIX ${textoTipoCambio(fixDeHoy)}${fixHoy.fecha ? ` del ${formatoDia(fixHoy.fecha)}` : ""} + colchón. Se guarda con fecha en esta cotización al escribir el neto.`
              : "Todavía no hay tipo de cambio de hoy. El Dueño lo captura en Configuración › Precios."}
        </p>
      ) : null}

      {directo !== null || proveedores.length ? (
        <Fila
          etiqueta={
            <>
              <OjoTachado /> Reservar vía
            </>
          }
        >
          <select
            aria-label="Reservar vía"
            value={p.proveedorId ?? ""}
            onChange={(e) => alElegirProveedor(e.target.value || null)}
            className={`${CAJA} w-[150px] font-semibold`}
          >
            <option value="">{directo ?? "Directo"}</option>
            {proveedores.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
          </select>
        </Fila>
      ) : null}

      <div>
        <Etiqueta>Utilidad</Etiqueta>
        {utilidadFijaPb !== undefined ? (
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-tinta-3">En vuelos la utilidad es fija por política.</span>
            <span className="rounded-lg bg-tarjeta px-2 py-1 text-[12.5px] font-bold shadow-borde">
              {textoPorcentaje(utilidadFijaPb)} fija
            </span>
          </div>
        ) : (
          <Segmentos
            chico
            etiqueta="Utilidad"
            opciones={[...new Set([...MARGENES, p.utilidadPb])]
              .sort((a, b) => a - b)
              .map((m) => ({ valor: String(m), etiqueta: textoPorcentaje(m) }))}
            valor={String(p.utilidadPb)}
            alCambiar={(v) => alCambiar({ utilidadPb: Number(v), utilidadManual: Number(v) !== utilidadBasePb })}
          />
        )}
      </div>

      <div>
        <Etiqueta>Pago al proveedor</Etiqueta>
        <Segmentos
          chico
          etiqueta="Pago al proveedor"
          opciones={[...PAGOS]}
          valor={p.pagoProveedor}
          alCambiar={(v) =>
            alCambiar({ pagoProveedor: v, anticipoProveedorPb: v === "anticipo" ? p.anticipoProveedorPb || 3000 : 0 })
          }
        />
        {p.pagoProveedor === "anticipo" ? (
          <div className="mt-2 rounded-[10px] bg-tarjeta p-2.5 text-[12.5px] shadow-borde">
            <div className="flex items-center justify-between">
              <span className="text-tinta-2">Anticipo al proveedor</span>
              <span className="flex items-center gap-1">
                <input
                  aria-label="Anticipo al proveedor (%)"
                  inputMode="numeric"
                  value={String(p.anticipoProveedorPb / 100)}
                  onChange={(e) => {
                    const n = Math.min(100, Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0));
                    alCambiar({ anticipoProveedorPb: n * 100 });
                  }}
                  className="num h-7 w-12 rounded-md bg-tarjeta text-right font-semibold shadow-borde outline-none"
                />
                %
              </span>
            </div>
            {anticipo !== null ? (
              <>
                <div className="mt-1.5 flex justify-between text-tinta-2">
                  Al reservar <span className="num">{formatoDinero(anticipo)}</span>
                </div>
                <div className="flex justify-between text-tinta-2">
                  En destino <span className="num">{formatoDinero(calc.enDestino)}</span>
                </div>
              </>
            ) : null}
          </div>
        ) : p.pagoProveedor === "en_el_lugar" ? (
          <p className="mt-1.5 text-[11.5px] text-tinta-3">
            El cliente lo paga en el destino, directo al proveedor. No entra en los pagos a Airoo.
          </p>
        ) : null}
      </div>

      <div className="mt-1 border-t border-linea pt-3">
        <div className="flex items-end justify-between">
          <span className="text-[13px] text-tinta-2">Precio</span>
          <div className="text-right">
            <p className="num text-[20px] font-bold tracking-[-0.01em]">
              {calc.precio !== null ? formatoDinero(calc.precio) : "—"}
            </p>
            <p className="num text-[11.5px] text-tinta-3">{pp(calc.precio)}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-[10px] bg-ambar-tenue px-2.5 py-1.5 text-[12.5px]">
          <span className="flex items-center gap-1 text-ambar">
            <OjoTachado /> Tu ganancia
          </span>
          <span className="num font-bold text-ambar">{calc.ganancia !== null ? formatoDinero(calc.ganancia) : "—"}</span>
        </div>
      </div>
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-[12.5px] font-semibold text-tinta-2">{etiqueta}</span>
      {children}
    </div>
  );
}

