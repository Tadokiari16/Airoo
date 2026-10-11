# Airoo — sistema de cotizaciones y viajes

Sistema interno de la agencia de viajes Airoo (Cancún) y la vista web que recibe el cliente. Equipo de 3 personas: el dueño y dos asesoras. Todo en español de México.

Los diseños están en `disenos/`:
- `disenos/capturas/*.png`: cómo se ve cada pantalla. Es la referencia visual.
- `disenos/html/*.dc.html`: los prototipos interactivos. Sirven para leer textos, estados y comportamiento. Usan un motor de plantillas propio del prototipo (`<x-dc>`, `sc-for`, `sc-if`, `DCLogic`): **no se reutiliza ese código**, se reconstruye con el stack del proyecto.
- `disenos/capturas/Sistema-Mapa.png`: mapa de módulos, flujos y decisiones.
- `disenos/capturas/SistemaPropuesta-v4.png`: reglas visuales del lado del cliente.

## Reglas de negocio (no cambiar sin preguntar)

**Precios y dinero**
- Los precios **siempre se capturan a mano en el armador**, en cada cotización. Ningún catálogo guarda precios.
- Cada servicio (hotel, vuelo, actividad, traslado, seguro) lleva **un solo «Costo neto total»**, en la moneda de la tarifa: lo que cobra el proveedor por todo el servicio, no por habitación ni por persona. Si el proveedor da precio por persona, la asesora hace la multiplicación afuera; el sistema no lo pide así.
- La moneda es de cada tarifa (MXN, USD o EUR), no del hotel ni del proveedor.
- Tipo de cambio para cotizar: FIX de Banxico del día + colchón configurable (hoy 1.5%). Se guarda con fecha en la cotización.
- Tolerancia de precio al validar: monto fijo de $300 MXN por servicio. Si sube menos, Airoo lo absorbe; si sube más, se manda versión 2 al cliente.
- «Cargo por servicio» (no «fee»). Los precios no llevan IVA salvo que el cliente pida factura.
- Comisión de Airoo sobre viajes de asesoras: **35% de la utilidad** (venta − costo). Ejemplo: venta $20,000, utilidad $2,000 → Airoo $700, asesora $1,300.

**Pagos**
- **Desde el sistema no se hacen pagos.** Se registra lo que ya se pagó: cuándo, con qué, a qué cuenta, monto real y comprobante.
- Pagos del cliente: SPEI; se confirman con el CEP de Banxico (o en el portal del banco si es del mismo banco).
- Plazo de «Datos y pago» al aprobar: hasta 3 horas con el precio respetado.
- Aviso de pago a proveedores: 1 día antes de la fecha límite de cada reserva.
- Cuentas de proveedores (CLABE o tarjeta donde reciben): una cuenta nueva o cambiada queda pendiente hasta confirmarla por llamada al número que ya estaba registrado. El primer pago a una cuenta nueva se marca para revisión.

**Proveedores**
- Proveedores guarda **solo datos**: quién es, si es plataforma (sitio + número de agencia) o directo, contactos (varios, con rol), cuentas donde recibe, nota interna.
- **No guarda reglas.** Cuándo se paga, con qué, en qué moneda y qué cancelación aplica es el **acuerdo de cada reserva**. El armador propone el último acuerdo con ese proveedor como punto de partida, editable.
- Las aerolíneas no son proveedores: viven en el catálogo de Aerolíneas.

**Catálogos**
- Sin API en la primera versión. Alta manual con lo mínimo (nombre + ciudad) y se completa en la ficha. La importación (RateHawk/TBO) queda como conexión opcional futura, apagada: mientras no haya una conexión encendida en Configuración, «Nuevo hotel» abre directo la captura manual.
- Ciudades: lista compartida por hoteles, actividades y viajes. Solo administradores agregan ciudades; avisar si hay una con nombre parecido.
- Hotel: portada separada (16:9, mínimo 1600×900, con ajuste de encuadre; avisar si la foto es chica o cuadrada), galería de la propiedad, habitaciones (solo el nombre que ve el cliente y su propio grupo de fotos), dirección + liga de Google Maps, teléfono público, ID de Tripadvisor, reglas del hotel, cargos que se pagan en el hotel (con su moneda), dónde se puede reservar (plataformas con ID, sin obligar).
- Camas y número de personas **no** van en el catálogo: se eligen en el armador (lista fija de camas; personas por defecto 4).
- Actividad: ficha base igual para todas (nombre, ciudad, tipo, duración en texto libre, descripción, fotos) + 8 bloques opcionales que se encienden por actividad: cómo se cobra (por persona/edad/grupo/unidad), planes, boletos por edad, horarios, cómo llega el cliente, incluye/no incluye/qué llevar, requisitos, cómo se confirma. El tipo sugiere bloques, no apaga ninguno con datos. Proveedores ligados se consultan, no se copian.
- Servicios (seguros, conectividad, equipo, reservaciones): el tipo se elige al darlo de alta y después no se cambia. Las indicaciones para el cliente van en «En el viaje confirmado».
- Traslados: el catálogo guarda **tipos de unidad** (sedán, SUV, van, Sprinter, van adaptada), cada uno con nombre, pasajeros máximos, maletas máximas, si es adaptada, foto y descripción. **Sin ciudad, proveedor ni precio**, y sin inventario de flotilla. Los traslados ya no viven en Servicios.
- Traslado en el armador: modo aeropuerto–hotel (propuesto con el vuelo y el hotel de la cotización) o libre (origen y destino a mano); privado o compartido; sencillo o redondo; fecha y hora; «Se reserva en» (hoy TBO de punto de partida), moneda de la tarifa y costo neto total. En privado se elige la unidad y se avisa si los pasajeros o las maletas superan su capacidad; en compartido no se elige unidad. Si el vuelo del que salió el traslado cambia de horario, el traslado queda «por revisar».
- Traslado al reservar (Fase 4): se sube la confirmación del proveedor. El operador (nombre, teléfono, WhatsApp) se captura después como dato de esa reserva, **no es un proveedor del catálogo**. Aviso si faltan 3 días para el servicio y no hay operador. Cuando está capturado, el cliente ve el contacto del operador en su agenda.
- Aerolíneas: cada tarifa con opciones cerradas: equipaje de mano y documentado («No incluye» o piezas con kilos), cambios (Sin cambios, Con cargo, Sin cargo) y artículo personal (encendido por defecto). La TUA no va en el catálogo: depende de los aeropuertos y se captura en el armador. «Llegar antes» (nacional e internacional) se configura en Configuración › Datos y horario.
- Archivar: interruptor con confirmación. Eliminar solo si nunca se usó; si se usó, solo archivar. «Unir con otro hotel» para duplicados.

**Cancelación**
- Al cliente se le muestra un solo «cargo por cancelación» por servicio (lo que retiene el proveedor + la ganancia de Airoo que no se devuelve). El desglose solo lo ve el equipo.
- La condición se le muestra por escrito antes de pagar (Datos y pago).
- Devolución por SPEI nuevo o crédito Airoo (vence en 12 meses).

**Roles**
- Dueño: todo. Asesora: cotiza, envía, reserva, confirma pagos, ve costos y utilidad solo de sus viajes. Contador: finanzas y confirmación de pagos.

## Tono de los textos

«Tú, pero cortés, nunca informal». Descriptivo, ni mandón ni corporativo.
- Los textos describen qué pasa y por qué. Las órdenes (imperativos) solo en botones.
- Nada de «Debes», «Tienes que», «Recuerda», «Asegúrate», «Nunca», «Obligatorio». Si algo no se puede, se dice por qué.
- Sin signos de exclamación, sin mayúsculas sostenidas, sin emojis.
- Usar los textos de los prototipos tal cual; ya pasaron por revisión de tono.

## Diseño

- Panel interno: herramienta de trabajo, no ligada a la marca. Escritorio, 1440 px de referencia; la vista del viaje y Avisos deben funcionar en celular.
- Vista del cliente: móvil primero (390 px de referencia), logo blanco de Airoo sobre azul.
- Formato de fechas: «Mié 21 oct». Dinero: $42,248.48; dólares US$1,980.
- Tipografía: Plus Jakarta Sans en el panel; Gilroy en la vista del cliente. Los archivos de fuente viven en el repo y se cargan desde ahí, nunca desde un servicio externo.

## Decisiones técnicas (aprobadas el 10 oct 2026)

Detalle en `propuestas/Propuesta-stack-modelo-fases-0-1.md`.

**Stack**: Next.js (App Router) + TypeScript, Supabase (Postgres, Auth, Storage), Drizzle ORM con migraciones en el repo, Tailwind, Vercel. Todo se construye y prueba en local hasta que Luis cree las cuentas de Supabase y Vercel.

**Dinero**: centavos enteros + moneda en cada tarifa. Nunca decimales flotantes.

**Enlaces del cliente y del pasajero**
- El acceso es con un token aleatorio largo, nunca con el folio. Ejemplo: `airoo.mx/c/k8Fq2...`.
- El folio (AIR-2458) solo se muestra; no da acceso a nada.

**Documentos de viajeros** (INE, IDMEX, pasaporte)
- En un bucket privado, con ligas temporales, visibles solo para el equipo.
- Se borran 90 días después de que termina el viaje, junto con los números de IDMEX y pasaporte capturados.
- Datos y pago guarda que el cliente aceptó el aviso de privacidad (con fecha y versión).

**Cambio de la cuenta de cobro de Airoo**: se confirma con un código por correo o volviendo a escribir la contraseña. No por WhatsApp: no usamos API de WhatsApp (solo ligas wa.me).

**Tripadvisor**: el ID, la calificación y el número de opiniones se capturan a mano. Sin API en esta versión.

**Plazo de Datos y pago**: se calcula al abrir el enlace, comparando con la hora de vencimiento guardada. No hay cron para eso.

**Tareas programadas (cron)**: solo el FIX diario de Banxico y los avisos de pago.

**Viajes**: no hay tipos (cotización o itinerario). Todo es un viaje con etapas.

**Permisos**: la asesora ve todos los viajes, pero costos y utilidad solo de los suyos.

**Comisión de la asesora**: se marca «Para pagar» cuando el viaje termina.

## Cómo trabajar en este repo

- Antes de construir una pantalla, abrir su captura y su HTML en `disenos/` y respetar textos, estados y orden.
- Trabajar por fases (ver PLAN.md). Al empezar cada fase: proponer el plan y el modelo de datos de esa fase, esperar aprobación, construir, probar.
- Si un diseño contradice una regla de este archivo, manda este archivo y se pregunta.
- Datos de ejemplo: el viaje de Nataly Cervantes (AIR-2458, Cancún, 21–27 oct, Seadust Cancún Family Resort) que aparece en todos los prototipos.

## Cómo correrlo en local

Ver README.md. En corto: `supabase start`, `npm run semilla`, `npm run dev`.
- Esquema en `src/lib/db/schema.ts`; migraciones con `npm run db:generar` (quedan en `supabase/migrations`).
- Permisos por rol en un solo lugar: `src/lib/permisos.ts`.
- Next.js 16 cambia varias APIs: antes de escribir código de Next, revisar AGENTS.md.
