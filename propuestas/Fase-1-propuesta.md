# Fase 1 · Catálogos — propuesta aprobada

**Aprobada por Luis el 10 oct 2026, incluidas las 8 soluciones del punto 3, con tres cambios ya aplicados aquí: permisos de cuentas, quién elimina y une, y cómo se editan Servicios y Aerolíneas.**

Punto de partida: la propuesta aprobada el 10 oct (`Propuesta-stack-modelo-fases-0-1.md`), que ya tiene el modelo de catálogos y las 23 tareas. Aquí solo va el orden de las pantallas, los ajustes al modelo que salieron de revisar las capturas y los HTML, y los puntos donde un diseño choca con el CLAUDE.md.

Nada se construye hasta que lo apruebes.

---

## 1. Orden de las pantallas

El orden sigue las dependencias: hoteles, actividades y servicios se ligan a proveedores, así que Proveedores va primero. Configuración va al final porque ninguna pantalla de catálogos depende de ella.

| # | Pantalla | Captura | Por qué en este lugar | Al terminar ya se puede |
|---|---|---|---|---|
| 0 | **Base común** | — | Lo usan las cinco pantallas | Lista con pestañas y filtros, panel lateral con «1 de 9» y flechas, archivar y reactivar con confirmación, eliminar solo si nunca se usó, subir fotos con aviso de foto chica o cuadrada y encuadre 16:9 |
| 1 | **Proveedores** | Catalogo-Proveedores | Los demás catálogos se ligan a él | Dar de alta plataformas y directos, contactos, cuentas donde reciben con verificación por llamada, nota interna. «Últimos acuerdos» con su estado vacío |
| 2 | **Hoteles y su ficha** | Catalogo-Hoteles, Hotel-Ficha | Es el catálogo que más usa el armador | Alta con nombre y ciudad, portada y galería, habitaciones con fotos y nombres por plataforma, cargos en el hotel, dónde se reserva, «Por completar», unir duplicados, vista previa como cliente |
| 3 | **Actividades y su ficha** | Catalogo-Actividades, Actividad-Ficha | Reusa fotos y proveedores ligados de los dos anteriores | Ficha base + los 8 bloques que se encienden por actividad, «Lo paga el cliente en el lugar», resumen «En el armador se va a pedir» |
| 4 | **Servicios** | Catalogo-Servicios | Mismo patrón que actividades, más corto | Traslados, seguros y extras con su modelo de cobro, unidades o planes y lo que ve el cliente |
| 5 | **Aerolíneas** | Catalogo-Aerolineas | Independiente de los demás | Agregar una aerolínea desde la lista IATA, tarifas y equipaje, ventanas de check-in con su fuente y «Marcar verificado» |
| 6 | **Configuración** | Configuracion | Las secciones de equipo, ciudades y bitácora ya existen desde la Fase 0 | Precios, tolerancia, tipo de cambio, cuenta de cobro de Airoo, plazos para el cliente, formas de pago a proveedores, datos y horario, conexiones apagadas |
| 7 | **Pruebas, capturas y liga** | — | Cierre de fase | Pruebas de las reglas, capturas de cada pantalla y la guía para crear Supabase y Vercel con la liga para probar en tu navegador |

Al terminar cada pantalla corro sus pruebas; las capturas para tu revisión van todas juntas al final, en `fase-1/capturas/`.

---

## 2. Ajustes al modelo de datos

Son cambios chicos sobre el modelo aprobado. Ninguno guarda precios en un catálogo.

**2.1 Una sola tabla de fotos.** En lugar de `hotel_fotos` y `actividad_fotos` por separado, una tabla `fotos` con `hotel_id`, `habitacion_id` o `actividad_id` (exactamente uno lleno), `archivo`, `ancho`, `alto`, `orden`, `es_portada`, `encuadre`. Así el mismo componente sube, ordena y encuadra en hoteles, habitaciones y actividades.

**2.2 Archivar igual en todos los catálogos.** `archivado_en`, `archivado_por` y `motivo_archivo` en proveedores, hoteles, actividades, servicios y aerolíneas (antes el motivo solo estaba en hoteles).

**2.3 «Usado en N viajes» y «Eliminar».** Hoy ningún catálogo está usado, porque las partidas llegan en la Fase 2. La regla «eliminar solo si nunca se usó» queda en una sola función que en la Fase 2 empieza a contar partidas; mientras tanto, el contador de uso muestra 0 y se puede eliminar.

**2.4 Tripadvisor a mano.** Se agrega `tripadvisor_actualizado_en` al hotel, para saber de cuándo es la calificación capturada (ver 3.1).

**2.5 «Por completar» del hotel con las 9 casillas de la ficha.** La ficha cuenta «8 de 9» con: portada 16:9, galería, descripción, dirección y mapa, fotos por habitación, nombres en plataformas, Tripadvisor, cargos en el hotel y teléfono de reservaciones. Se calcula, no se guarda. Un hotel con solo nombre y ciudad lleva la etiqueta «Mínima», como Park Hyatt Kioto en la captura.

**2.6 Aerolíneas en dos tablas.** La lista IATA completa (unas 900) va a una tabla de referencia `aerolineas_iata` (`iata`, `nombre`, `pais`) que se carga una vez. El catálogo `aerolineas` solo tiene las que Airoo usa (la captura muestra 3) y «Agregar aerolínea» busca en la lista de referencia. Se quita `logo`: la captura usa el código (VB, Y4, AM) en un círculo y no hay una fuente libre de logos.

**2.7 Ajustes nuevos en `configuracion`.** Los que aparecen en el prototipo y no estaban: vigencia de la cotización (7 días, sin pasar del pago del hotel), llegar al aeropuerto antes (2 h nacional, 3 h internacional; lo muestra la ficha de aerolínea como «Regla general del sistema») y recordatorios de pago al cliente en «3 días y 1 día antes» (la propuesta decía «3 días y el mismo día»; tomo el del prototipo).

**2.8 Datos de ejemplo.** Proveedores, hoteles, actividades, servicios y aerolíneas de los prototipos con sus nombres reales de negocio (RateHawk, Seadust, Parque Xcaret). Las personas de contacto llevan nombres genéricos («Contacto de ventas», «Contacto de reservas») y teléfonos ficticios, como en la Fase 0. Las fotos de ejemplo son degradados como los del prototipo, sin fotos reales de los hoteles.

**2.9 Dónde viven las fotos.** Las fotos de catálogo las ve el cliente, así que van a un bucket público de Supabase Storage con nombres aleatorios; los documentos de viajeros siguen en el bucket privado de fases posteriores. En local se guardan en una carpeta del proyecto con la misma interfaz, porque en este contenedor Supabase Storage no arranca; con tu cuenta de Supabase se cambia a Storage sin tocar las pantallas.

---

## 3. Donde el diseño choca con el CLAUDE.md

Según el CLAUDE.md, manda el CLAUDE.md y se pregunta. Así lo resolvería; confírmalo o cámbialo.

**3.1 Tripadvisor «en vivo».** Hotel-Ficha dice «ID de Tripadvisor · encontrado» y «La calificación se actualiza sola»; Catalogo-Hoteles dice «Tripadvisor, en vivo». El CLAUDE.md dice que el ID, la calificación y las opiniones se capturan a mano. Propuesta: tres campos a mano y el texto «Capturada el Mar 28 sep» en lugar de «en vivo».

**3.2 «Encontrado» junto al ID de plataforma.** En «Dónde se puede reservar», el ID de RateHawk y TBO dice «Encontrado», que supone consultar su API. Sin API en esta versión: el ID se captura y no se muestra esa etiqueta.

**3.3 Código por WhatsApp para cambiar la cuenta de cobro.** Configuración dice «pide un código por WhatsApp al dueño». El CLAUDE.md dice código por correo o volver a escribir la contraseña, sin WhatsApp. Propuesta: código por correo, con la contraseña como alternativa, y la nueva cuenta se activa 24 h después como dice el prototipo.

**3.4 Avisos de pago «En Avisos y por WhatsApp».** Sin API de WhatsApp, el sistema no puede mandar el aviso por WhatsApp solo. Propuesta: el ajuste dice «En Avisos» y, si se quiere, el aviso trae un botón que abre WhatsApp con el mensaje escrito (liga wa.me). Los avisos se construyen en la Fase 4; aquí solo se guarda el ajuste.

**3.5 Aerolínea «la misma ficha que en Proveedores».** El encabezado del panel de VivaAerobus dice eso, pero el CLAUDE.md y el pie de Proveedores dicen que las aerolíneas no son proveedores. Propuesta: quitar esa frase y dejar «19 viajes».

**3.6 Subtipos de actividad.** La lista de actividades muestra «Tour en barco» y «Tour a pie», pero la ficha tiene 7 tipos fijos (tour, excursión, parque o entrada, day pass, experiencia, espectáculo, otro). Propuesta: solo los 7 tipos; «en barco» o «a pie» van en la descripción.

**3.7 «Por persona o por cama» del day pass.** La lista lo muestra, pero la ficha solo ofrece por persona, por edad, por grupo y por unidad. Propuesta: el camastro o la cama se cobra «Por unidad».

**3.8 Rol en «Tu cuenta».** Los prototipos dicen «Administrador»; se muestra «Dueño», como en la Fase 0.

---

## 4. Permisos de la Fase 1

Se agregan a `src/lib/permisos.ts`, sin cambiar la matriz aprobada.

| Acción | Dueño | Asesora | Contador |
|---|---|---|---|
| Ver catálogos | Sí | Sí | Solo Proveedores |
| Agregar y editar hoteles, actividades, servicios, aerolíneas y proveedores | Sí | Sí | No |
| Archivar y reactivar | Sí | Sí | No |
| Eliminar (solo si nunca se usó) y unir duplicados | Sí | No | No |
| Agregar, aprobar o rechazar cuentas donde recibe un proveedor | Sí | No | No |
| Ver una cuenta de proveedor completa y copiarla | Sí | No, la ve enmascarada (••8812) | Sí |
| Configuración (precios, cobros, pagos, datos, conexiones) | Sí | No | No |
| Cambiar la cuenta de cobro de Airoo | Sí | No | No |

La sección «Cuentas donde recibe» dice «Administradores» en el prototipo; se toma como Dueño. Cada alta, cambio, aprobación o rechazo de cuenta queda en la bitácora, y también cada vez que alguien ve o copia una cuenta completa.

**Servicios** no tiene ficha diseñada: se usa el patrón de la ficha de actividad, simplificado (datos base, variantes, cómo se cobra, lo que recibe el cliente, proveedores ligados). **Aerolíneas** se edita desde su panel lateral, sin ficha aparte.

---

## 5. Pruebas que demuestran las reglas

**Reglas (Vitest)**
- Ningún catálogo tiene columnas de precio: la prueba recorre el esquema y falla si aparece un campo de monto fuera de `hotel_cargos` (que es lo que se paga en el hotel, con su moneda).
- Una cuenta de proveedor nueva o cambiada nace «pendiente»; solo pasa a «verificada» con «Confirmé el cambio por teléfono» marcado y por el Dueño. Mientras tanto se sigue mostrando la anterior.
- El primer pago a una cuenta nueva queda marcado para revisión (el campo existe desde ya; los pagos llegan en la Fase 4).
- Eliminar se niega si el registro se usó; archivar siempre se puede.
- Portada: avisa con menos de 1600×900 y con proporción cuadrada o vertical.
- Unir hoteles: el duplicado queda archivado con `unido_a`; sus habitaciones, nombres por plataforma, IDs y fotos pasan al que se conserva, sin duplicar.
- Actividad: cambiar el tipo sugiere bloques, pero no apaga ninguno que tenga datos.
- Cambiar la cuenta de cobro pide código o contraseña y la nueva no se activa antes de 24 h.
- Permisos de la tabla de arriba, por rol.

**Navegador (Playwright)**
- Dar de alta un proveedor directo con cuenta, verificarla como Dueño y ver que la asesora no puede aprobarla.
- Crear un hotel con nombre y ciudad, subir una portada cuadrada y ver el aviso, ajustar el encuadre, agregar habitación con su nombre de plataforma, archivar y reactivar.
- Crear una actividad, encender y apagar bloques, ligar un proveedor.
- Agregar una aerolínea desde la lista IATA buscando «VB».
- Cambiar la tolerancia en Configuración y verla en la bitácora.

---

## 6. Al terminar la fase

Antes de pedirte la aprobación, te guío paso a paso para crear las cuentas gratuitas de Supabase y Vercel, conecto el repo y te mando la liga para probarla en tu navegador junto con las capturas.
