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
- `src/lib/sesion.ts`: quién está usando el panel (verifica la sesión con Supabase y lee su perfil).
- `src/lib/db/schema.ts`: tablas. Todas tienen RLS encendido y sin políticas, así que nadie las lee por la API pública de Supabase; el panel las lee desde el servidor.
- `src/proxy.ts`: renueva la sesión y manda a «Entrar» a quien no tiene sesión.
- `src/app/(acceso)`: entrar, cambiar contraseña y aceptar invitación.
- `src/app/(panel)`: el panel con la barra lateral.
- `src/app/fuentes`: tipografías guardadas en el repo (Plus Jakarta Sans en el panel; Gilroy para la vista del cliente).

## Producción (cuando se cree el proyecto en Supabase y Vercel)

1. Crear el proyecto en Supabase y correr `npx supabase link` y `npx supabase db push`.
2. En Supabase › Authentication: desactivar el registro público, poner la URL del sitio y pegar la plantilla de `supabase/templates/recuperar.html` en «Reset password».
3. En Vercel, conectar el repo y poner las variables de `.env.example` con los valores del proyecto (la de `DATABASE_URL` es la del pooler en modo transacción). `LLAVE_CIFRADO` se genera nueva con `openssl rand -base64 32` y no se comparte: con ella se cifran los números de cuenta de los proveedores. `ALMACEN_FOTOS=supabase` para que las fotos vayan al bucket `fotos` (lo crea la migración `almacen_fotos`).
4. Correr la semilla solo si se quieren datos de ejemplo (`npm run semilla -- --forzar`).
