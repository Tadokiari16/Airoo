import { usuarioActual } from "@/lib/sesion";

// El armador ocupa toda la pantalla: sin la barra lateral del panel.
export default async function LayoutArmador({ children }: { children: React.ReactNode }) {
  await usuarioActual();
  return <>{children}</>;
}
