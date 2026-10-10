import { usuarioCon } from "@/lib/sesion";
import { Encabezado } from "../encabezado";
import { SinAcceso } from "../sin-acceso";
import { ConAvisos } from "./controles";
import { personasEnEquipo } from "./datos";
import { SubNav } from "./subnav";

export default async function LayoutConfiguracion({ children }: { children: React.ReactNode }) {
  if (!(await usuarioCon("configuracion"))) return <SinAcceso />;
  const equipo = await personasEnEquipo();
  return (
    <>
      <Encabezado titulo="Configuración">
        Reglas de la agencia. Lo que cambies aquí aplica a los viajes nuevos; los que ya están en curso
        conservan sus reglas.
      </Encabezado>
      <div className="flex items-start gap-6">
        <SubNav equipo={equipo} />
        <div className="max-w-[820px] min-w-0 flex-1">
          <ConAvisos>{children}</ConAvisos>
        </div>
      </div>
    </>
  );
}
