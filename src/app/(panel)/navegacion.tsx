"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconoActividades,
  IconoAerolineas,
  IconoAvisos,
  IconoClientes,
  IconoConfiguracion,
  IconoFinanzas,
  IconoHoteles,
  IconoProveedores,
  IconoServicios,
  IconoTraslados,
  IconoViajes,
} from "@/components/iconos";

const ICONOS = {
  viajes: IconoViajes,
  avisos: IconoAvisos,
  clientes: IconoClientes,
  finanzas: IconoFinanzas,
  hoteles: IconoHoteles,
  actividades: IconoActividades,
  servicios: IconoServicios,
  traslados: IconoTraslados,
  aerolineas: IconoAerolineas,
  proveedores: IconoProveedores,
  configuracion: IconoConfiguracion,
};

export type ItemNav = { href: string; etiqueta: string; icono: keyof typeof ICONOS; contador?: number };
export type GrupoNav = { titulo?: string; items: ItemNav[] };

export function Navegacion({ grupos }: { grupos: GrupoNav[] }) {
  const ruta = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {grupos.map((g, i) => (
        <div key={g.titulo ?? i} className="flex flex-col gap-0.5">
          {g.titulo ? (
            <div className="px-2.5 pt-3.5 pb-1.5 text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
              {g.titulo}
            </div>
          ) : null}
          {g.items.map((it) => {
            const activo = ruta === it.href || ruta.startsWith(it.href + "/");
            const Icono = ICONOS[it.icono];
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={activo ? "page" : undefined}
                className={`flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-semibold ${
                  activo ? "bg-azul-tenue text-azul-oscuro" : "text-tinta-2 hover:bg-suave"
                }`}
              >
                <Icono className={activo ? "text-azul" : "text-tinta-3"} />
                {it.etiqueta}
                {it.contador ? (
                  <span className="num ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gris px-1.5 text-xs font-bold text-tinta">
                    {it.contador}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
