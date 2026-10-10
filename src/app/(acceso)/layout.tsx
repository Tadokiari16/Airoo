import Image from "next/image";

export default function LayoutAcceso({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Image src="/marca/airoo-icono.png" alt="" width={30} height={30} priority />
          <b className="text-[19px] font-bold tracking-[-0.02em]">airoo</b>
        </div>
        <div className="rounded-tarjeta bg-tarjeta p-7 shadow-tarjeta">{children}</div>
      </div>
    </main>
  );
}
