import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { SubNav } from "./subnav";

export default async function LayoutConfiguracion({ children }: { children: React.ReactNode }) {
  if (!(await usuarioCon("configuracion"))) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Configuración">
        Cómo trabaja la agencia: quién está en el equipo, la lista de ciudades y quién cambió qué.
      </Encabezado>
      <div className="flex items-start gap-6">
        <SubNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
