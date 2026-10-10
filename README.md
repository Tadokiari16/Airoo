# Airoo

Sistema interno de cotizaciones y viajes de Airoo (Cancún) y la vista web que recibe el cliente.

- Reglas de negocio, tono y decisiones técnicas: [CLAUDE.md](CLAUDE.md)
- Fases de construcción: [PLAN.md](PLAN.md)
- Stack y modelo de datos aprobados: [propuestas/](propuestas/Propuesta-stack-modelo-fases-0-1.md)
- Diseños de referencia: [disenos/](disenos/)

## Stack

Next.js 16 (App Router) + TypeScript · Supabase (Postgres, Auth, Storage) · Drizzle ORM · Tailwind CSS 4 · Vitest y Playwright.

## Correrlo en local

Requisitos: Node 22, Docker (para Supabase local).

```bash
npm install
cp .env.example .env.local      # ya trae las llaves de Supabase local
npx supabase start              # Postgres, Auth y Storage en Docker; aplica supabase/migrations
npm run semilla                 # equipo de ejemplo, ciudades y ajustes
npm run dev                     # http://localhost:3000
```

Cuentas de ejemplo (contraseña `airoo-local-2026`):

| Correo               | Rol      |
| -------------------- | -------- |
| dueno@airoo.local    | Dueño    |
| asesora1@airoo.local | Asesora  |
| asesora2@airoo.local | Asesora  |
| contador@airoo.local | Contador |

Los correos que manda Supabase local (cambio de contraseña) se ven en http://127.0.0.1:54324.

## Comandos

| Comando                              | Qué hace                                                    |
| ------------------------------------ | ----------------------------------------------------------- |
| `npm run dev`                        | Panel en modo desarrollo                                    |
| `npm run typecheck` · `npm run lint` | Revisión de tipos y estilo                                  |
| `npm test`                           | Pruebas de reglas (dinero, fechas, permisos)                |
| `npm run test:e2e`                   | Pruebas en navegador; requieren Supabase local y la semilla |
| `npm run db:generar`                 | Genera la migración a partir de `src/lib/db/schema.ts`      |
| `npm run db:reiniciar`               | Borra la base local y vuelve a aplicar las migraciones      |

## Cómo está armado

- `src/lib/permisos.ts`: qué puede hacer cada rol. Es el único lugar donde se decide.
- `src/lib/cuentas.ts` y `src/lib/cifrado.ts`: reglas de las cuentas de proveedores (CLABE, tarjeta, verificación por llamada) y su cifrado.
- `src/components/catalogo`: piezas compartidas de los catálogos (pestañas, tabla, panel lateral, archivar y eliminar, fotos con encuadre 16:9).
- `src/lib/fotos.ts`, `src/lib/imagenes.ts` y `src/lib/almacen.ts`: reglas de la portada, los dos tamaños webp de cada foto y dónde se guardan (carpeta `.almacen` en local, bucket público `fotos` de Supabase en producción, según `ALMACEN_FOTOS`).
- `src/lib/hoteles.ts`: qué le falta a la ficha de un hotel (los 9 puntos), cargos y Tripadvisor.
- `src/lib/actividades.ts`: tipos de actividad, los 8 bloques opcionales, qué bloques sugiere cada tipo (al cambiarlo no se apaga ninguno) y qué va a pedir el armador.
- `src/app/(panel)/fotos-acciones.ts`: subir, ordenar, encuadrar y quitar fotos; las comparten hoteles y actividades.
- `src/lib/servicios.ts`: tipos de servicio, modelo de cobro sugerido por tipo, cómo se llaman sus variantes (unidades, planes, tipos) y qué le falta a la ficha.
- `src/app/(panel)/proveedores/donde-reservar.tsx`: el bloque «Dónde se puede reservar» que comparten actividades y servicios.
- `src/lib/aerolineas.ts`: equipaje por tarifa, ventanas de check-in con su fuente y búsqueda en la lista IATA.
- `src/lib/configuracion.ts`: los ajustes de la agencia con sus valores de fábrica, qué se acepta guardar en cada uno y la regla de las 24 h de la cuenta para recibir pagos (se calcula al leer, sin cron).
- `scripts/aerolineas-iata.mjs`: genera la migración con la lista IATA de referencia a partir de los datos de [OpenFlights](https://openflights.org/data) (licencia [ODbL](https://opendatacommons.org/licenses/odbl/1-0/)), con correcciones para las aerolíneas que cambiaron o dejaron de volar.
- `src/lib/sesion.ts`: quién está usando el panel (verifica la sesión con Supabase y lee su perfil).
- `src/lib/db/schema.ts`: tablas. Todas tienen RLS encendido y sin políticas, así que nadie las lee por la API pública de Supabase; el panel las lee desde el servidor.
- `src/proxy.ts`: renueva la sesión y manda a «Entrar» a quien no tiene sesión.
- `src/app/(acceso)`: entrar, cambiar contraseña y aceptar invitación.
- `src/app/(panel)`: el panel con la barra lateral (en celular, un menú arriba).
- `src/lib/cotizacion.ts`: cálculo de cada partida y de los totales en centavos, plan de pagos (con el tope de días antes del viaje) y vigencia. Los totales no se guardan: se calculan.
- `src/lib/armador.ts`, `src/lib/armador-textos.ts` y `src/lib/etapas.ts`: lo que el armador revisa antes de enviar, cómo se nombra cada partida y las etapas del viaje.
- `src/app/(panel)/viajes`: lista de viajes, nuevo viaje y la vista del viaje.
- `src/app/(armador)/viajes/[folio]/armador`: el armador de cotizaciones, a pantalla completa. Guarda cada servicio solo, unos instantes después del último cambio.
- `src/lib/tipo-cambio.ts` y `src/app/api/tareas/tipo-cambio`: el FIX de Banxico del día (tarea diaria de Vercel) o capturado a mano.
- `scripts/semilla-viajes.ts`: los viajes de ejemplo (AIR-2458 de Nataly Cervantes y dos más). Se borran desde Configuración › Datos y horario y ya no vuelven.
- `src/app/fuentes`: tipografías guardadas en el repo (Plus Jakarta Sans en el panel; Gilroy para la vista del cliente).

## Producción (Supabase + Vercel)

Vercel corre `npm run vercel-build`: primero `scripts/arranque.ts` aplica las migraciones pendientes y, si la base no tiene a nadie (primer arranque), siembra en modo producción: el Dueño con el correo de `DUENO_CORREO` (y una contraseña al azar; entra con «¿Olvidaste tu contraseña?»), ciudades, ajustes y catálogos de ejemplo. Después corre `next build`. No hace falta la CLI de Supabase.

1. En Supabase › Authentication: desactivar el registro público, poner la URL del sitio y pegar la plantilla de `supabase/templates/recuperar.html` en «Reset password» y la de `supabase/templates/codigo.html` en «Magic link» (es el código para confirmar el cambio de la cuenta de cobro; lleva solo el código, sin liga para entrar).
2. En Vercel, conectar el repo y poner estas variables:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la «publishable»), `SUPABASE_SERVICE_ROLE_KEY` (la «secret»).
   - `DATABASE_URL`: la del pooler en modo transacción (puerto 6543), con la contraseña de la base.
   - `LLAVE_CIFRADO`: 32 bytes en base64, nueva y sin compartir; con ella se cifran los números de cuenta. Se puede generar en el SQL Editor de Supabase con `select encode(gen_random_bytes(32), 'base64');`.
   - `ALMACEN_FOTOS=supabase`, para que las fotos vayan al bucket `fotos` (lo crea la migración `almacen_fotos`).
   - `DUENO_CORREO` y `DUENO_NOMBRE`: quién es el Dueño en el primer arranque.
   - `NEXT_PUBLIC_SITE_URL` es opcional: sin ella se usa la dirección de producción de Vercel.
   - `BANXICO_TOKEN`: el token del SIE de Banxico para el FIX diario. Sin él, el Dueño captura el FIX a mano en Configuración › Precios.
   - `CRON_SECRET`: una cadena larga al azar; Vercel la manda a la tarea diaria del tipo de cambio para que nadie más la pueda llamar.
3. Mientras una fase se prueba antes de unirla a main, en Vercel › Settings › Environments › Production › Branch Tracking va la rama de esa fase. Vercel solo deja elegir una rama que ya tenga un deploy.
