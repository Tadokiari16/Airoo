import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const global = globalThis as unknown as { conexion?: ReturnType<typeof postgres> };

// prepare: false porque el pooler de Supabase (modo transacción) no admite
// sentencias preparadas.
const conexion = global.conexion ?? postgres(process.env.DATABASE_URL!, { prepare: false });
if (process.env.NODE_ENV !== "production") global.conexion = conexion;

export const db = drizzle(conexion, { schema, casing: "snake_case" });
export { schema };
