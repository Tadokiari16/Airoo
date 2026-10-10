import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatoFechaHora, partesEnCancun, formatoHora } from "@/lib/fechas";
import { NOMBRE_ROL, ROLES, puede, type Permiso } from "@/lib/permisos";
import { usuarioActual } from "@/lib/sesion";
import { EncabezadoTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { Avatar, Insignia } from "@/components/ui/insignia";
import { AccionesPersona, BotonInvitar, CancelarInvitacion } from "./interactivo";

export const metadata: Metadata = { title: "Equipo y permisos" };

function ultimoAcceso(fecha: Date | null, ahora: Date): string {
  if (!fecha) return "todavía no entra";
  const a = partesEnCancun(fecha),
    h = partesEnCancun(ahora);
  const ayer = partesEnCancun(new Date(ahora.getTime() - 86400_000));
  const mismoDia = (x: typeof a, y: typeof a) => x.anio === y.anio && x.mes === y.mes && x.dia === y.dia;
  if (mismoDia(a, h)) return `entró hoy ${formatoHora(fecha)}`;
  if (mismoDia(a, ayer)) return `entró ayer ${formatoHora(fecha)}`;
  return `entró el ${formatoFechaHora(fecha)}`;
}

const PERMISOS: { texto: string; permiso: Permiso | "costos" }[] = [
  { texto: "Cotizar, enviar y reservar", permiso: "cotizar" },
  { texto: "Ver costos y utilidad", permiso: "costos" },
  { texto: "Confirmar pagos de clientes", permiso: "confirmar_pagos" },
  { texto: "Cancelar viajes y reembolsar", permiso: "cancelar_viajes" },
  { texto: "Ver Finanzas", permiso: "ver_finanzas" },
  { texto: "Cambiar cuentas para recibir pagos", permiso: "cambiar_cuentas" },
  { texto: "Configuración, equipo y ciudades", permiso: "configuracion" },
];

export default async function Equipo() {
  const yo = await usuarioActual();
  const ahora = new Date();
  const personas = await db
    .select()
    .from(schema.usuarios)
    .orderBy(desc(schema.usuarios.activo), asc(schema.usuarios.creadoEn));
  const pendientes = await db
    .select()
    .from(schema.invitaciones)
    .where(eq(schema.invitaciones.estado, "pendiente"))
    .orderBy(desc(schema.invitaciones.creadoEn));

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta>
        <EncabezadoTarjeta titulo="Equipo">
          <BotonInvitar />
        </EncabezadoTarjeta>
        <ul className="border-t border-linea">
          {personas.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-b border-linea px-[18px] py-3 last:border-b-0"
            >
              <Avatar
                iniciales={p.id === yo.id ? "TÚ" : p.iniciales}
                tono={p.rol === "contador" ? "verde" : p.rol === "asesora" ? "morado" : "azul"}
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {p.id === yo.id ? "Tú" : p.nombre}
                  {!p.activo ? (
                    <span className="ml-2">
                      <Insignia tono="gris">Sin acceso</Insignia>
                    </span>
                  ) : null}
                </div>
                <div className="text-[13px] text-tinta-3">
                  {p.rol === "dueno"
                    ? "Dueño · único que puede cambiar cuentas y quitar personas"
                    : `${NOMBRE_ROL[p.rol]} · ${ultimoAcceso(p.ultimoAcceso, ahora)}`}
                </div>
              </div>
              {p.rol !== "dueno" && p.id !== yo.id ? (
                <AccionesPersona id={p.id} nombre={p.nombre} rol={p.rol} activo={p.activo} />
              ) : (
                <Insignia tono="azul">{NOMBRE_ROL[p.rol]}</Insignia>
              )}
            </li>
          ))}
        </ul>
      </Tarjeta>

      {pendientes.length > 0 ? (
        <Tarjeta>
          <EncabezadoTarjeta
            titulo="Invitaciones pendientes"
            sub="Cada liga sirve una vez y vence en 24 horas."
          />
          <ul className="border-t border-linea">
            {pendientes.map((i) => {
              const vencida = i.venceEn < ahora;
              return (
                <li
                  key={i.id}
                  className="flex items-center gap-3 border-b border-linea px-[18px] py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{i.nombre}</div>
                    <div className="text-[13px] text-tinta-3">
                      {i.correo} · {NOMBRE_ROL[i.rol]} ·{" "}
                      {vencida
                        ? "la liga venció; se puede invitar de nuevo"
                        : `vence el ${formatoFechaHora(i.venceEn)}`}
                    </div>
                  </div>
                  {vencida ? (
                    <Insignia tono="ambar">Vencida</Insignia>
                  ) : (
                    <Insignia tono="azul">Pendiente</Insignia>
                  )}
                  <CancelarInvitacion id={i.id} nombre={i.nombre} />
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      ) : null}

      <Tarjeta>
        <EncabezadoTarjeta
          titulo="Qué puede hacer cada rol"
          sub="Tres roles bastan para una agencia chica. Lo delicado va separado."
        />
        <table className="w-full border-t border-linea text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
              <th className="px-[18px] py-2.5 font-bold">Permiso</th>
              {ROLES.map((r) => (
                <th key={r} className="px-3 py-2.5 text-center font-bold">
                  {NOMBRE_ROL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISOS.map((f) => (
              <tr key={f.texto} className="border-t border-linea">
                <td className="px-[18px] py-2.5">{f.texto}</td>
                {ROLES.map((r) => {
                  const v =
                    f.permiso === "costos"
                      ? r === "asesora"
                        ? "De sus viajes"
                        : "Sí"
                      : puede(r, f.permiso)
                        ? "Sí"
                        : "No";
                  return (
                    <td
                      key={r}
                      className={`px-3 py-2.5 text-center ${v === "No" ? "text-tinta-3" : "font-semibold"}`}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  );
}
