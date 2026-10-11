# Pendientes

Cosas que no bloquean la fase en curso pero no se pueden olvidar.

## Textos legales

- **Aviso de privacidad:** debe mencionar que en el enlace del cliente se mide qué secciones ve y cuánto tiempo (Hospedaje, Vuelos, Actividades, Servicios, Inversión), para que la asesora sepa qué le interesó más. Lo pidió Luis el 10 oct 2026 al aprobar la Fase 2. Las visitas del equipo no se miden.

## Cuentas y servicios

- **Correos de Supabase en español:** hace falta un SMTP propio; el plan gratuito de Supabase no deja editar las plantillas sin él.
- **Token de Banxico (SIE):** para el FIX diario del tipo de cambio. Mientras no esté, el Dueño captura el FIX a mano en Configuración › Precios.

## Armador (para la entrega 2b o después)

- «Revisar y enviar» y «Vista previa» quedan apagados en la 2a; llegan con la entrega 2b junto con la propuesta del cliente.
- Del prototipo del armador faltan «Duplicar como otra opción» y el «Deshacer» después de quitar algo. Hoy quitar un servicio pide confirmación.
- El precio de cada servicio se captura en la tarjeta del armador después de «Agregar al viaje», no dentro del diálogo, para que hotel, vuelo, actividad y servicio usen el mismo editor.
- Tres niveles de revisión (ajuste del 11 oct 2026): el error no impide capturar, solo enviar; el aviso no bloquea; la observación es neutra y no afecta precios. Errores: servicio con fechas fuera del viaje, llegada de vuelo anterior a la salida, costo neto en cero (y los que ya había: número de vuelo inválido, mismo aeropuerto, estancia sin noche). Avisos: fecha de pago o de cancelación gratuita pasada o posterior a la llegada. Observación: las habitaciones suman más huéspedes que el viaje. Al construir «Revisar y enviar» (2b), el servidor tiene que volver a revisar los errores antes de enviar: hoy solo se muestran en pantalla.
- El número de vuelo se valida contra el catálogo de Aerolíneas (la clave del número), no contra la aerolínea de la tarjeta: así caben los vuelos en código compartido.
- Al pasar a «Costo neto total», los netos que ya había por habitación o por boleto se sumaron en uno. Un vuelo ya capturado con un aeropuerto escrito que no está en la lista quedó sin ese aeropuerto, para elegirlo otra vez.

## Ajustes visuales (pedidos el 11 oct 2026, sin fecha)

- Íconos con lucide-react en lugar de los SVG propios.
- Insignias (badges) en las listas de revisión de las fichas y en las tablas de catálogo.
- Anillo de foco con `focus-visible`: que se vea al usar el teclado, sin aparecer al hacer clic. El foco nunca se quita.
- Alinear el pie de la barra lateral.
- Selects y campos de hora con los componentes de Fase 0.

## Al unir la rama de ajustes de catálogos y traslados

- Migración aparte que borre lo que quedó sin usar: la tabla `hotel_habitacion_nombres`, `aerolineas.como_se_compra` y las columnas de texto `mano`, `documentada` y `cambios` de `aerolinea_tarifas`. Mientras la vista previa y producción compartan base, solo se agregan cosas.
- Los traslados que quedaron como servicio (tipo «traslado» en Servicios, y sus partidas en cotizaciones viejas) se pasan al tipo de partida «traslado» con su unidad, y después se quita el tipo «traslado» de Servicios.

## Ajustes de la entrega 2a (pedidos el 11 oct 2026)

- **Mensajes:** los avisos nuevos (nota guardada, viaje actualizado) usan el estilo actual; se unifican en la pasada de consistencia.
- **Editar cliente:** «Editar viaje» cambia el cliente del viaje (otro que ya existe o uno nuevo). Corregir el nombre o el WhatsApp de un cliente existente espera a la ficha del cliente, que sigue pendiente de diseño; el cambio tocaría todos sus viajes.
- **Nombre y apellidos:** la ficha del viaje ya usa el nombre completo de `clientes.nombre`. Falta separar apellidos: hay una migración propuesta (columna `apellidos` opcional, sin tocar datos) en `propuestas/Clientes-apellidos.md`, sin aplicar hasta que Luis la apruebe. Los viajeros (`viajeros.nombres` y `apellidos`) llegan con Datos y pago.
- **Edades:** se conserva la captura de 0 a 17 años para los menores. Bajo cada edad se indica solo para informar: «Bebé» (menos de 2), «Menor» (2 a 11) y «Cuenta como adulto en vuelos» (12 a 17). No cambia ningún precio, porque los costos se capturan a mano.
- **Bebés:** no hay un contador aparte; un bebé es un menor con edad menor de 2. No entra en el divisor del precio por persona, y donde se muestra ese precio dice «sin contar bebés». Un menor sin edad capturada se cuenta como menor.
- **Editar viaje con la cotización enviada (requisito de 2b):** hasta 2b, «Editar viaje» funciona igual aunque la cotización ya esté enviada. Desde 2b, editar fechas, pasajeros, servicios o precios de una cotización enviada crea la versión 2, como indica «editar después de enviar = borrador de versión 2».
- **Más de un vuelo por cotización:** propuesta en `propuestas/Varios-vuelos.md`; no está implementada.
