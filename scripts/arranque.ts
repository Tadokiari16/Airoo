// Se corre antes de cada `next build` en Vercel (script «vercel-build»):
//   1. Aplica las migraciones pendientes de supabase/migrations.
//   2. Si la base no tiene a nadie todavía (primer arranque), corre la semilla
//      en modo producción: el Dueño de DUENO_CORREO, ciudades, ajustes y
//      catálogos de ejemplo.
// Las dos cosas se pueden repetir sin riesgo: lo ya aplicado no se toca.

import { config } from "dotenv";
config({ path: ".env.local" });

import { spawnSync } from "node:child_process";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL.");
  const conexion = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  const db = drizzle(conexion);

  await migrate(db, { migrationsFolder: "supabase/migrations" });
  console.log("Migraciones al día.");

  const [{ n }] = await conexion<{ n: number }[]>`select count(*)::int as n from public.usuarios`;
  await conexion.end();
  if (n > 0) {
    console.log("La base ya tiene equipo; no se siembra nada.");
    return;
  }

  console.log("Primer arranque: se siembra la base.");
  const r = spawnSync("npx", ["tsx", "scripts/semilla.ts", "--forzar", "--produccion"], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("La semilla no terminó.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
