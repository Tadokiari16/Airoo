"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Precios, cobros, pagos a proveedores y datos de la agencia llegan en la Fase 1.
const SECCIONES = [
  {
    titulo: "Agencia",
    items: [
      { href: "/configuracion/equipo", etiqueta: "Equipo y permisos" },
      { href: "/configuracion/ciudades", etiqueta: "Ciudades" },
      { href: "/configuracion/bitacora", etiqueta: "Bitácora" },
    ],
  },
];

export function SubNav() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Secciones de configuración"
      className="sticky top-6 flex w-[200px] shrink-0 flex-col gap-0.5"
    >
      {SECCIONES.map((s) => (
        <div key={s.titulo} className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1.5 text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
            {s.titulo}
          </div>
          {s.items.map((it) => {
            const activo = ruta.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={activo ? "page" : undefined}
                className={`flex h-9 items-center rounded-[10px] px-2.5 text-sm font-semibold ${
                  activo
                    ? "bg-tarjeta text-tinta shadow-[0_1px_2px_rgba(17,26,43,.1)]"
                    : "text-tinta-2 hover:bg-tarjeta/60"
                }`}
              >
                {it.etiqueta}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
