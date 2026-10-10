"use client";

import { useState, useTransition } from "react";
import { soloDigitos } from "@/lib/cuentas";
import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Insignia } from "@/components/ui/insignia";
import { IconoFinanzas, IconoMas, IconoTarjeta } from "@/components/iconos";
import { activarFormaPago, agregarFormaPago } from "../acciones";
import {
  CampoAjuste,
  Fijo,
  Fila,
  Seccion,
  Subtitulo,
  leerEntero,
  useAvisar,
  useGuardarAjuste,
  GUARDADO,
} from "../controles";
import type { FormaPago } from "../datos";
import { Cuenta } from "../cobros/cobros";

export function PagosProveedores({ formas, avisoDias }: { formas: FormaPago[]; avisoDias: number }) {
  const guardar = useGuardarAjuste();
  const avisar = useAvisar();
  const [nueva, setNueva] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const alternar = (f: FormaPago) =>
    iniciar(async () => {
      const r = await activarFormaPago(f.id, !f.activa);
      avisar("error" in r ? r.error : GUARDADO);
    });

  return (
    <div className="flex flex-col gap-4">
      <Seccion
        titulo="Pagos a proveedores"
        sub="Las formas de pago de Airoo. Aparecen como opciones al registrar un pago a un proveedor, para saber con qué se pagó y cuadrarlo con los estados de cuenta. Desde aquí no se hacen pagos."
        accion={
          <Boton variante="secundario" onClick={() => setNueva(true)}>
            <IconoMas tam={16} /> Agregar forma de pago
          </Boton>
        }
      >
        {formas.length === 0 ? (
          <p className="py-3 text-[13.5px] text-tinta-2">
            Todavía no hay formas de pago. Se agregan con su nombre y los últimos 4 dígitos.
          </p>
        ) : (
          formas.map((f) => (
            <Cuenta
              key={f.id}
              icono={f.tipo === "tarjeta" ? <IconoTarjeta /> : <IconoFinanzas tam={16} />}
              titulo={`${f.nombre} ··${f.ultimos4}`}
              sub={
                [f.uso, f.banco].filter(Boolean).join(" · ") || (f.tipo === "tarjeta" ? "Tarjeta" : "Cuenta")
              }
              insignia={f.activa ? null : <Insignia tono="gris">En desuso</Insignia>}
              accion={
                <Boton variante="texto" onClick={() => alternar(f)} disabled={pendiente}>
                  {f.activa ? "Dejar de usar" : "Volver a usar"}
                </Boton>
              }
            />
          ))
        )}
        <div className="h-2" />
        <Fila
          titulo="Aviso antes de la fecha límite de pago"
          sub="Para cualquier reserva sin pagar; la fecha la marca cada reserva"
          id="aviso-proveedor"
        >
          <CampoAjuste
            id="aviso-proveedor"
            valor={avisoDias}
            texto={String}
            leer={leerEntero}
            modo="numeric"
            sufijo={avisoDias === 1 ? "día antes" : "días antes"}
            alGuardar={(d) => guardar("aviso_pago_proveedor", { dias_antes: d })}
          />
        </Fila>
        <Fila titulo="Avisos de pago" sub="En Avisos; cada aviso trae la liga para mandarlo por WhatsApp">
          <Fijo>En Avisos</Fijo>
        </Fila>
        <Fila titulo="Transferencias a proveedores directos" sub="Solo a cuentas verificadas por llamada">
          <Fijo>Fijo</Fijo>
        </Fila>

        <Subtitulo
          titulo="Conexiones"
          sub="Opcionales. Sin ellas todo se captura a mano y el sistema funciona igual."
        />
        <Fila
          titulo="Importar hoteles desde RateHawk"
          sub="Se activa cuando RateHawk habilita su API de contenido para Airoo; mientras tanto, los hoteles se capturan a mano"
        >
          <Fijo apagado>Sin conexión</Fijo>
        </Fila>
        <Fila
          titulo="Importar hoteles desde TBO Holidays"
          sub="Igual que RateHawk: depende de que TBO active su API"
        >
          <Fijo apagado>Sin conexión</Fijo>
        </Fila>
      </Seccion>

      <Dialogo
        abierto={nueva}
        alCerrar={() => setNueva(false)}
        titulo="Nueva forma de pago"
        sub="Solo se guardan los últimos 4 dígitos, para reconocerla en los estados de cuenta."
      >
        <NuevaForma
          alCancelar={() => setNueva(false)}
          alAgregar={() => {
            setNueva(false);
            avisar("Forma de pago agregada · queda en la bitácora");
          }}
        />
      </Dialogo>
    </div>
  );
}

function NuevaForma({ alCancelar, alAgregar }: { alCancelar: () => void; alAgregar: () => void }) {
  const [tipo, setTipo] = useState<"tarjeta" | "cuenta">("tarjeta");
  const [nombre, setNombre] = useState("");
  const [banco, setBanco] = useState("");
  const [ultimos4, setUltimos4] = useState("");
  const [uso, setUso] = useState("Crédito");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const agregar = () =>
    iniciar(async () => {
      const r = await agregarFormaPago({ tipo, nombre, banco, ultimos4, uso });
      if ("error" in r) return setError(r.error);
      alAgregar();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Selector
          etiqueta="Tipo"
          id="forma-tipo"
          value={tipo}
          onChange={(e) => {
            const t = e.target.value as "tarjeta" | "cuenta";
            setTipo(t);
            setUso(t === "tarjeta" ? "Crédito" : "Transferencias SPEI");
          }}
        >
          <option value="tarjeta">Tarjeta</option>
          <option value="cuenta">Cuenta</option>
        </Selector>
        <Campo
          etiqueta="Nombre"
          id="forma-nombre"
          value={nombre}
          placeholder={tipo === "tarjeta" ? "Ej. Tarjeta Airoo" : "Ej. Cuenta Airoo"}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
        />
        <Campo
          etiqueta="Banco"
          id="forma-banco"
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          autoComplete="off"
        />
        <Campo
          etiqueta="Últimos 4 dígitos"
          id="forma-ultimos4"
          value={ultimos4}
          inputMode="numeric"
          maxLength={4}
          onChange={(e) => setUltimos4(soloDigitos(e.target.value))}
          autoComplete="off"
        />
        <div className="col-span-2">
          <Campo
            etiqueta="Uso"
            id="forma-uso"
            value={uso}
            onChange={(e) => setUso(e.target.value)}
            ayuda="Crédito, débito, transferencias SPEI…"
            autoComplete="off"
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-rojo">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" className="h-10" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton onClick={agregar} disabled={pendiente || nombre.trim().length < 2 || ultimos4.length !== 4}>
          Agregar forma de pago
        </Boton>
      </div>
    </div>
  );
}
