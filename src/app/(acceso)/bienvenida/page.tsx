import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NOMBRE_ROL } from "@/lib/permisos";
import { invitacionPendiente } from "@/lib/sesion";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { FormularioBienvenida } from "./formulario";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function Bienvenida() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  const inv = await invitacionPendiente(data.user.id);
  if (!inv) redirect("/entrar?motivo=liga-vencida");

  return (
    <>
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">Hola, {inv.nombre}</h1>
      <p className="mt-1 text-tinta-2">
        Entras al equipo de Airoo como {NOMBRE_ROL[inv.rol]}. Elige una contraseña para tu cuenta {inv.correo}
        .
      </p>
      <FormularioBienvenida />
    </>
  );
}
