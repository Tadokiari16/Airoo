// Datos de ejemplo para trabajar en local: el equipo de los prototipos,
// la lista de ciudades y los ajustes de CLAUDE.md.
//   npm run semilla
// Solo corre contra una base local, salvo que se pase --forzar.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { iniciales, normalizar } from "../src/lib/texto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(url) && !process.argv.includes("--forzar")) {
  console.error("La semilla es para la base local. Usa --forzar si de verdad quieres otra.");
  process.exit(1);
}

const CONTRASENA = process.env.SEMILLA_CONTRASENA ?? "airoo-local-2026";

const EQUIPO = [
  { nombre: "Luis", correo: "dueno@airoo.local", rol: "dueno" },
  { nombre: "Asesora 1", correo: "asesora1@airoo.local", rol: "asesora" },
  { nombre: "Asesora 2", correo: "asesora2@airoo.local", rol: "asesora" },
  { nombre: "Contador", correo: "contador@airoo.local", rol: "contador" },
] as const;

const CIUDADES: [string, string, string][] = [
  ["Cancún", "Quintana Roo", "México"],
  ["Playa del Carmen", "Quintana Roo", "México"],
  ["Tulum", "Quintana Roo", "México"],
  ["Holbox", "Quintana Roo", "México"],
  ["Puerto Aventuras", "Quintana Roo", "México"],
  ["Bacalar", "Quintana Roo", "México"],
  ["Mérida", "Yucatán", "México"],
  ["San Cristóbal de las Casas", "Chiapas", "México"],
  ["Oaxaca", "Oaxaca", "México"],
  ["Puerto Vallarta", "Jalisco", "México"],
  ["Guadalajara", "Jalisco", "México"],
  ["Ciudad de México", "CDMX", "México"],
  ["Barcelona", "Cataluña", "España"],
  ["Val Gardena", "Trentino-Alto Adigio", "Italia"],
  ["Kioto", "Kioto", "Japón"],
];

// Reglas vigentes de CLAUDE.md. Las pantallas para cambiarlas llegan en la Fase 1.
const AJUSTES: Record<string, unknown> = {
  tolerancia_precio: { centavos: 30000, moneda: "MXN", por: "servicio" },
  colchon_tipo_cambio: { porcentaje: 1.5 },
  plazo_datos_y_pago: { horas: 3 },
  aviso_pago_proveedor: { dias_antes: 1 },
  comision_airoo: { porcentaje_de_utilidad: 35 },
  credito_airoo: { meses_vigencia: 12 },
  agencia: { nombre_comercial: "Airoo", horario: "Lun–Sáb · 9 AM – 7 PM" },
};

async function main() {
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const conexion = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(conexion, { schema, casing: "snake_case" });

  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const p of EQUIPO) {
    let cuenta = lista?.users.find((u) => u.email === p.correo);
    if (!cuenta) {
      const { data, error } = await admin.auth.admin.createUser({
        email: p.correo,
        password: CONTRASENA,
        email_confirm: true,
      });
      if (error) throw error;
      cuenta = data.user!;
    }
    await db
      .insert(schema.usuarios)
      .values({
        id: cuenta.id,
        nombre: p.nombre,
        iniciales: iniciales(p.nombre),
        correo: p.correo,
        rol: p.rol,
      })
      .onConflictDoNothing();
  }

  for (const [nombre, region, pais] of CIUDADES) {
    await db
      .insert(schema.ciudades)
      .values({ nombre, region, pais, nombreBusqueda: normalizar(nombre) })
      .onConflictDoNothing();
  }

  for (const [clave, valor] of Object.entries(AJUSTES)) {
    await db.insert(schema.configuracion).values({ clave, valor }).onConflictDoNothing();
  }

  await conexion.end();
  console.log(`Listo. Equipo: ${EQUIPO.map((e) => e.correo).join(", ")} · contraseña: ${CONTRASENA}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
