import { usuarioCon } from "@/lib/sesion";
import { formatoFechaHora } from "@/lib/fechas";
import { entradasBitacora } from "../datos";

const celda = (v: string) => `"${v.replaceAll('"', '""')}"`;

export async function GET() {
  if (!(await usuarioCon("configuracion"))) return new Response("Sin acceso", { status: 403 });
  const filas = await entradasBitacora();
  const csv = [
    ["Cuándo", "Qué cambió", "Quién"].map(celda).join(","),
    ...filas.map((f) => [formatoFechaHora(f.cuando), f.texto, f.quien ?? "Sistema"].map(celda).join(",")),
  ].join("\r\n");
  // BOM para que Excel lea bien los acentos.
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bitacora-airoo.csv"',
    },
  });
}
