import Link from "next/link";
import { IconoFoto } from "@/components/iconos";
import { MarcoPortada, type FotoCatalogo } from "./fotos";

/** Portada y dos fotos más en el panel lateral; la última dice cuántas faltan. */
export function FotosPanel({
  portada,
  galeria,
  href,
}: {
  portada: FotoCatalogo | null;
  galeria: FotoCatalogo[];
  href: string;
}) {
  const fotos = [portada, ...galeria].filter((f) => !!f);
  return fotos.length ? (
    <div className="mt-3 grid h-[154px] grid-cols-[2fr_1fr] grid-rows-2 gap-1.5 overflow-hidden rounded-[14px]">
      <div className="relative row-span-2 overflow-hidden">
        {portada ? (
          <MarcoPortada foto={portada} className="h-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura del bucket
          <img src={fotos[0].url} alt="" className="size-full object-cover" />
        )}
        {portada ? (
          <span className="absolute top-2 left-2 rounded-md bg-tinta/75 px-1.5 py-0.5 text-[11px] font-bold text-white">
            Portada
          </span>
        ) : null}
      </div>
      {[1, 2].map((i) =>
        fotos[i] ? (
          <div key={i} className="relative overflow-hidden bg-gris">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del bucket */}
            <img src={fotos[i].miniatura} alt="" className="size-full object-cover" />
            {i === 2 && fotos.length > 3 ? (
              <Link
                href={href}
                className="absolute inset-0 flex items-center justify-center bg-tinta/45 text-[13px] font-bold text-white"
              >
                +{fotos.length - 3} fotos
              </Link>
            ) : null}
          </div>
        ) : (
          <div key={i} className="bg-suave" />
        ),
      )}
    </div>
  ) : (
    <Link
      href={href}
      className="mt-3 flex h-[110px] flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-linea text-[13px] font-semibold text-tinta-2 hover:border-azul hover:text-azul-oscuro"
    >
      <IconoFoto tam={18} />
      Sin fotos · se suben en la ficha
    </Link>
  );
}
