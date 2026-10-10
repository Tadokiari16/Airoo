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
- Una fecha límite de pago o de cancelación que ya pasó es error: mientras siga así, ese servicio no se guarda. Con cotizaciones viejas (y los viajes de ejemplo, cuando pasen sus fechas) habrá que mover o borrar esa fecha antes de editar lo demás. Si estorba, se puede bajar a aviso para cotizaciones ya enviadas.
- El número de vuelo se valida contra el catálogo de Aerolíneas (la clave del número), no contra la aerolínea de la tarjeta: así caben los vuelos en código compartido.
- Al pasar a «Costo neto total», los netos que ya había por habitación o por boleto se sumaron en uno. Un vuelo ya capturado con un aeropuerto escrito que no está en la lista quedó sin ese aeropuerto, para elegirlo otra vez.
