import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// Las migraciones se escriben en supabase/migrations para que `supabase start`
// y `supabase db push` las apliquen igual en local y en producción.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./supabase/migrations",
  casing: "snake_case",
  schemaFilter: ["public"],
  migrations: { prefix: "supabase" },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
