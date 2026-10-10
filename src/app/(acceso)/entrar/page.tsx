import type { Metadata } from "next";
import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

const MOTIVOS: Record<string, string> = {
  desactivada: "Esta cuenta está desactivada. El dueño puede volver a activarla.",
  "sin-acceso": "Esta cuenta no tiene acceso al panel. El dueño puede mandarte una invitación.",
  "liga-vencida": "La liga ya se usó o venció. Puedes pedir otra.",
};

export default async function Entrar({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams;
  return (
    <>
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">Entrar al panel</h1>
      <p className="mt-1 text-tinta-2">Con el correo y la contraseña de tu cuenta de Airoo.</p>
      {motivo && MOTIVOS[motivo] ? (
        <p role="status" className="mt-4 rounded-campo bg-ambar-tenue px-3 py-2.5 text-[13px] text-ambar">
          {MOTIVOS[motivo]}
        </p>
      ) : null}
      <FormularioEntrar />
    </>
  );
}
