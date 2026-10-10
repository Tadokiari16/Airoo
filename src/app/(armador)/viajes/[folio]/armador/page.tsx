import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { puede } from "@/lib/permisos";
import { usuarioActual } from "@/lib/sesion";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { cargarArmador } from "./datos";
import { Armador } from "./armador";

const folioDe = (texto: string) => {
  const n = Number(texto.replace(/^AIR-/i, ""));
  return Number.isInteger(n) && n > 0 ? n : null;
};

export async function generateMetadata({ params }: { params: Promise<{ folio: string }> }): Promise<Metadata> {
  return { title: `Armador · AIR-${(await params).folio}` };
}

export default async function PaginaArmador({ params }: { params: Promise<{ folio: string }> }) {
  const yo = await usuarioActual();
  const folio = folioDe((await params).folio);
  if (!folio) notFound();
  if (!puede(yo.rol, "cotizar"))
    return (
      <Aviso titulo="Armar cotizaciones no está disponible para tu rol">
        El viaje y sus pagos se pueden ver desde la lista de viajes.
      </Aviso>
    );
  const datos = await cargarArmador(folio, yo);
  if (!datos) notFound();
  if (datos === "sin_permiso")
    return (
      <Aviso titulo="Este viaje lo atiende otra persona del equipo">
        Solo quien atiende el viaje y el Dueño arman su cotización. El viaje se puede ver desde la lista de viajes.
      </Aviso>
    );
  return <Armador datos={datos} />;
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[640px] px-5 py-10">
      <Tarjeta>
        <Vacio titulo={titulo}>{children}</Vacio>
      </Tarjeta>
    </main>
  );
}
