import Image from "next/image";
import { avisosSinLeer, usuarioActual } from "@/lib/sesion";
import { NOMBRE_ROL, puede } from "@/lib/permisos";
import { Avatar } from "@/components/ui/insignia";
import { IconoSalir } from "@/components/iconos";
import { salir } from "../(acceso)/acciones";
import { Navegacion, type GrupoNav } from "./navegacion";
import { Buscador } from "./buscador";

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const u = await usuarioActual();
  const sinLeer = await avisosSinLeer(u.id);

  // Cada rol ve solo lo que puede usar.
  const grupos: GrupoNav[] = [
    {
      items: [
        { href: "/viajes", etiqueta: "Viajes", icono: "viajes" },
        { href: "/avisos", etiqueta: "Avisos", icono: "avisos", contador: sinLeer || undefined },
        { href: "/clientes", etiqueta: "Clientes", icono: "clientes" },
        ...(puede(u.rol, "ver_finanzas")
          ? [{ href: "/finanzas", etiqueta: "Finanzas", icono: "finanzas" as const }]
          : []),
      ],
    },
    {
      titulo: "Catálogos",
      items: [
        ...(puede(u.rol, "ver_catalogos")
          ? [
              { href: "/hoteles", etiqueta: "Hoteles", icono: "hoteles" as const },
              { href: "/actividades", etiqueta: "Actividades", icono: "actividades" as const },
              { href: "/servicios", etiqueta: "Servicios", icono: "servicios" as const },
              { href: "/aerolineas", etiqueta: "Aerolíneas", icono: "aerolineas" as const },
            ]
          : []),
        ...(puede(u.rol, "ver_proveedores")
          ? [{ href: "/proveedores", etiqueta: "Proveedores", icono: "proveedores" as const }]
          : []),
      ],
    },
    {
      titulo: "Agencia",
      items: puede(u.rol, "configuracion")
        ? [{ href: "/configuracion", etiqueta: "Configuración", icono: "configuracion" }]
        : [],
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* En celular la navegación se abre desde la barra de arriba. */}
      <details className="group sticky top-0 z-40 border-b border-linea bg-tarjeta lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
          <Image src="/marca/airoo-icono.svg" alt="" width={26} height={26} className="size-[26px]" />
          <b className="text-[17px] font-bold tracking-[-0.02em]">airoo</b>
          <span className="ml-auto rounded-lg px-2.5 py-1 text-[13px] font-semibold shadow-borde">
            <span className="group-open:hidden">Menú</span>
            <span className="hidden group-open:inline">Cerrar</span>
          </span>
        </summary>
        <div className="max-h-[70dvh] overflow-auto px-3.5 pb-4">
          <Navegacion grupos={grupos.filter((g) => g.items.length > 0)} />
        </div>
      </details>
      <aside
        aria-label="Navegación"
        className="sticky top-0 hidden h-dvh lg:flex w-[232px] self-start shrink-0 flex-col gap-[22px] border-r border-linea bg-tarjeta px-3.5 py-5"
      >
        <div className="flex items-center gap-2.5 px-2 py-1">
          <Image
            src="/marca/airoo-icono.svg"
            alt=""
            width={30}
            height={30}
            className="size-[30px]"
            priority
          />
          <b className="text-[19px] font-bold tracking-[-0.02em]">airoo</b>
          <span className="ml-auto rounded-md border border-linea px-1.5 py-px text-[11.5px] font-semibold text-tinta-3">
            Panel
          </span>
        </div>
        <Navegacion grupos={grupos.filter((g) => g.items.length > 0)} />
        <div className="mt-auto flex items-center gap-2.5 border-t border-linea p-2.5">
          <Avatar iniciales="TÚ" />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold">{u.nombre}</div>
            <div className="text-xs text-tinta-3">{NOMBRE_ROL[u.rol]}</div>
          </div>
          <form action={salir} className="ml-auto">
            <button
              type="submit"
              title="Salir"
              aria-label="Salir"
              className="inline-flex size-7 items-center justify-center rounded-lg bg-fondo text-tinta-2 hover:bg-linea"
            >
              <IconoSalir tam={15} />
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-4 pb-10 lg:px-8 lg:pt-6">
        <div className="flex items-center gap-3.5">
          <Buscador />
        </div>
        {children}
      </main>
    </div>
  );
}
