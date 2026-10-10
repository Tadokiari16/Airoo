// Datos de ejemplo para trabajar en local: el equipo de los prototipos,
// la lista de ciudades, los ajustes de CLAUDE.md y los proveedores, hoteles
// y actividades de los prototipos. Los negocios llevan su nombre real; las personas de contacto,
// nombres genéricos y teléfonos ficticios.
//   npm run semilla
// Solo corre contra una base local, salvo que se pase --forzar.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { iniciales, normalizar } from "../src/lib/texto";
import { createCipheriv, randomBytes } from "node:crypto";
import { sembrarHoteles } from "./semilla-hoteles";
import { sembrarActividades } from "./semilla-actividades";
import { sembrarServicios } from "./semilla-servicios";
import { sembrarAerolineas } from "./semilla-aerolineas";

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
  ["Cozumel", "Quintana Roo", "México"],
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
  llegar_aeropuerto: { nacional_horas: 2, internacional_horas: 3 },
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

  const yo =
    lista?.users.find((u) => u.email === EQUIPO[0].correo) ??
    (await admin.auth.admin.listUsers({ perPage: 1000 })).data.users.find(
      (u) => u.email === EQUIPO[0].correo,
    );
  await sembrarProveedores(db, yo!.id);
  await sembrarHoteles(db, admin, yo!.id);
  await sembrarActividades(db, admin, yo!.id);
  await sembrarServicios(db, yo!.id);
  await sembrarAerolineas(db, yo!.id);

  await conexion.end();
  console.log(`Listo. Equipo: ${EQUIPO.map((e) => e.correo).join(", ")} · contraseña: ${CONTRASENA}`);
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

type Db = ReturnType<typeof drizzle<typeof schema>>;

function cifrar(texto: string): string {
  const llave = Buffer.from(process.env.LLAVE_CIFRADO!, "base64");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", llave, iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), datos.toString("base64")].join(".");
}

/** CLABE válida del banco dado que termina en `fin` (ajusta un dígito del medio). */
function clabe(banco: string, fin: string): string {
  for (let x = 0; x < 100; x++) {
    const n = banco + "180" + String(x).padStart(2, "0") + "000045" + fin.slice(0, 3);
    const pesos = [3, 7, 1];
    let suma = 0;
    for (let i = 0; i < 17; i++) suma += (Number(n[i]) * pesos[i % 3]) % 10;
    if (String((10 - (suma % 10)) % 10) === fin[3]) return n + fin[3];
  }
  throw new Error("Sin CLABE para " + fin);
}

/** Tarjeta válida (Luhn) que termina en `fin`. */
function tarjeta(prefijo: string, fin: string): string {
  for (let x = 0; x < 100; x++) {
    const n = prefijo + String(x).padStart(2, "0") + "0000" + fin;
    let suma = 0;
    for (let i = 0; i < n.length; i++) {
      let d = Number(n[n.length - 1 - i]);
      if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
      suma += d;
    }
    if (suma % 10 === 0) return n;
  }
  throw new Error("Sin tarjeta para " + fin);
}

type C = {
  nombre: string;
  paraQue: "reservas" | "ventas" | "pagos" | "emergencias";
  whatsapp?: string;
  correo?: string;
  horario?: string;
};
type Cta = {
  tipo: "clabe" | "tarjeta";
  banco: string;
  numero: string;
  aNombreDe: string;
  tel: string;
  verificada: string;
  cambio?: Omit<Cta, "verificada" | "cambio">;
};

const PROVEEDORES: {
  nombre: string;
  tipo: "plataforma" | "directo";
  categorias: string[];
  sitio?: string;
  numeroAgencia?: string;
  desde: string;
  nota?: string;
  contactos: C[];
  cuenta?: Cta;
}[] = [
  {
    nombre: "RateHawk",
    tipo: "plataforma",
    categorias: ["Hoteles"],
    sitio: "ratehawk.com",
    numeroAgencia: "1029384",
    desde: "2025-01-15",
    nota: "Las tarifas no reembolsables se cobran al reservar: conviene confirmarlas con el cliente antes de reservar.",
    contactos: [
      {
        nombre: "Contacto 1",
        paraQue: "ventas",
        whatsapp: "+52 55 1000 0101",
        correo: "ventas@ratehawk.example",
        horario: "Lun a vie, 9:00 AM a 7:00 PM",
      },
      {
        nombre: "Soporte de reservas",
        paraQue: "reservas",
        correo: "soporte@ratehawk.example",
        horario: "Todos los días, 24 horas",
      },
    ],
  },
  {
    nombre: "TBO Holidays",
    tipo: "plataforma",
    categorias: ["Hoteles", "Traslados"],
    sitio: "tboholidays.com",
    numeroAgencia: "MX-55210",
    desde: "2025-05-10",
    nota: "Cobra a la tarjeta en dólares; el banco hace la conversión.",
    contactos: [
      {
        nombre: "Contacto 2",
        paraQue: "ventas",
        whatsapp: "+52 55 1000 0102",
        correo: "mexico@tbo.example",
        horario: "Lun a vie, 9:00 AM a 6:00 PM",
      },
    ],
  },
  {
    nombre: "Civitatis",
    tipo: "plataforma",
    categorias: ["Tours y parques"],
    sitio: "civitatis.com/agencias",
    numeroAgencia: "Civitatis Pro 88310",
    desde: "2025-01-20",
    nota: "El voucher llega al correo de la cuenta; se sube al viaje tal cual.",
    contactos: [
      {
        nombre: "Soporte de agencias",
        paraQue: "reservas",
        correo: "agencias@civitatis.example",
        horario: "Lun a vie, 9:00 AM a 6:00 PM (España)",
      },
    ],
  },
  {
    nombre: "Grupo Xcaret",
    tipo: "plataforma",
    categorias: ["Tours y parques"],
    sitio: "agencias.xcaret.com",
    numeroAgencia: "AG-40117",
    desde: "2025-01-08",
    nota: "Tarifa nacional: piden INE de cada adulto en la puerta.",
    contactos: [
      {
        nombre: "Contacto 3",
        paraQue: "ventas",
        whatsapp: "+52 998 100 0103",
        correo: "agencias@xcaret.example",
        horario: "Lun a dom, 8:00 AM a 8:00 PM",
      },
    ],
  },
  {
    nombre: "Assist Card",
    tipo: "plataforma",
    categorias: ["Seguros"],
    sitio: "agencias.assistcard.com",
    numeroAgencia: "AC-7781",
    desde: "2025-02-03",
    nota: "Para mayores de 70 años la tarifa cambia y se cotiza aparte.",
    contactos: [
      {
        nombre: "Contacto 4",
        paraQue: "ventas",
        whatsapp: "+52 55 1000 0104",
        correo: "agencias.mx@assistcard.example",
        horario: "Lun a vie, 9:00 AM a 6:00 PM",
      },
      {
        nombre: "Asistencia al viajero",
        paraQue: "emergencias",
        whatsapp: "+52 800 100 0105",
        horario: "Todos los días, 24 horas · la llama el cliente",
      },
    ],
  },
  {
    nombre: "Traslados Riviera",
    tipo: "directo",
    categorias: ["Traslados"],
    desde: "2026-09-01",
    nota: "Un día antes confirma por WhatsApp, con nombre del chofer y placas de la unidad.",
    contactos: [
      {
        nombre: "Contacto 5",
        paraQue: "reservas",
        whatsapp: "+52 998 100 0106",
        horario: "Todos los días, 6:00 AM a 11:00 PM",
      },
    ],
    cuenta: {
      tipo: "clabe",
      banco: "BBVA",
      numero: clabe("012", "2201"),
      aNombreDe: "Transportes Riviera SA de CV",
      tel: "+52 998 100 0106",
      verificada: "2026-09-03",
      cambio: {
        tipo: "clabe",
        banco: "Santander",
        numero: clabe("014", "6604"),
        aNombreDe: "Transportes Riviera SA de CV",
        tel: "+52 998 100 0106",
      },
    },
  },
  {
    nombre: "Casa Mexicana San Cristóbal",
    tipo: "directo",
    categorias: ["Hoteles"],
    desde: "2025-03-12",
    nota: "Para grupos piden la lista de huéspedes 15 días antes.",
    contactos: [
      {
        nombre: "Contacto 6",
        paraQue: "reservas",
        whatsapp: "+52 967 100 0107",
        correo: "reservas@casamexicana.example",
        horario: "Todos los días, 8:00 AM a 9:00 PM",
      },
      {
        nombre: "Administración",
        paraQue: "pagos",
        correo: "admon@casamexicana.example",
        horario: "Lun a vie, 9:00 AM a 5:00 PM",
      },
    ],
    cuenta: {
      tipo: "clabe",
      banco: "BBVA",
      numero: clabe("012", "7740"),
      aNombreDe: "Casa Mexicana de Chiapas SA de CV",
      tel: "+52 967 100 0107",
      verificada: "2025-03-12",
    },
  },
  {
    nombre: "Holbox Mar Azul",
    tipo: "directo",
    categorias: ["Tours y parques"],
    desde: "2026-08-18",
    nota: "Solo responde por WhatsApp; las llamadas casi no las toma en temporada.",
    contactos: [
      {
        nombre: "Contacto 7",
        paraQue: "reservas",
        whatsapp: "+52 984 100 0108",
        horario: "Todos los días, 7:00 AM a 8:00 PM",
      },
    ],
    cuenta: {
      tipo: "tarjeta",
      banco: "Banamex",
      numero: tarjeta("520416", "8812"),
      aNombreDe: "Operadora Mar Azul",
      tel: "+52 984 100 0108",
      verificada: "2026-08-18",
    },
  },
  {
    nombre: "Yucatán Destinos DMC",
    tipo: "directo",
    categorias: ["Tours y parques", "Traslados"],
    desde: "2026-06-05",
    contactos: [
      {
        nombre: "Contacto 8",
        paraQue: "ventas",
        whatsapp: "+52 999 100 0109",
        correo: "grupos@yucatandestinos.example",
        horario: "Lun a sáb, 9:00 AM a 7:00 PM",
      },
      {
        nombre: "Operación en ruta",
        paraQue: "emergencias",
        whatsapp: "+52 999 100 0110",
        horario: "Todos los días, 24 horas",
      },
    ],
  },
];

async function sembrarProveedores(db: Db, duenoId: string) {
  const ya = await db.select({ id: schema.proveedores.id }).from(schema.proveedores).limit(1);
  if (ya.length) return;
  for (const p of PROVEEDORES) {
    const [nuevo] = await db
      .insert(schema.proveedores)
      .values({
        nombre: p.nombre,
        nombreBusqueda: normalizar(p.nombre),
        tipo: p.tipo,
        categorias: p.categorias,
        sitio: p.sitio ?? null,
        numeroAgencia: p.numeroAgencia ?? null,
        notaInterna: p.nota ?? null,
        desde: p.desde,
        creadoPor: duenoId,
      })
      .returning({ id: schema.proveedores.id });
    await db.insert(schema.proveedorContactos).values(
      p.contactos.map((c, i) => ({
        ...c,
        proveedorId: nuevo.id,
        principal: i === 0,
        creadoEn: new Date(Date.now() + i),
      })),
    );
    if (p.cuenta) {
      const c = p.cuenta;
      const [actual] = await db
        .insert(schema.proveedorCuentas)
        .values({
          proveedorId: nuevo.id,
          tipo: c.tipo,
          banco: c.banco,
          aNombreDe: c.aNombreDe,
          numeroCifrado: cifrar(c.numero),
          ultimos4: c.numero.slice(-4),
          estado: "verificada",
          telefonoLlamada: c.tel,
          confirmoPorTelefono: true,
          estadoCuentaCoincide: true,
          revisadaPor: duenoId,
          revisadaEn: new Date(c.verificada + "T12:00:00-05:00"),
          creadoPor: duenoId,
          creadoEn: new Date(c.verificada + "T11:00:00-05:00"),
        })
        .returning({ id: schema.proveedorCuentas.id });
      if (c.cambio) {
        await db.insert(schema.proveedorCuentas).values({
          proveedorId: nuevo.id,
          tipo: c.cambio.tipo,
          banco: c.cambio.banco,
          aNombreDe: c.cambio.aNombreDe,
          numeroCifrado: cifrar(c.cambio.numero),
          ultimos4: c.cambio.numero.slice(-4),
          estado: "pendiente",
          telefonoLlamada: c.tel,
          reemplazaA: actual.id,
          creadoPor: duenoId,
        });
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
