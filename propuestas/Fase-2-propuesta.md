# Fase 2 · Cotizar — propuesta aprobada

**Aprobada por Luis el 10 oct 2026, con estos ajustes ya aplicados aquí:**
- **6.1:** opción A con tope. El pago final vence 2 días antes de pagarle al hotel, pero nunca después de 15 días antes del viaje (lo que llegue primero). El segundo pago, una semana antes del pago final.
- **6.2, 6.3 (opción A) y 6.4:** como se recomiendan.
- **Folio:** los viajes de ejemplo conservan AIR-2458; los viajes reales empiezan en AIR-1001 y siguen el consecutivo.
- **Dinero** de un viaje de asesora muestra también «Comisión de Airoo (35%)» y «Para la asesora».
- El aviso de privacidad debe mencionar que se mide qué secciones ve el cliente en su enlace (anotado en PENDIENTES.md).

Punto de partida: el modelo aprobado el 10 oct (`Propuesta-stack-modelo-fases-0-1.md`, sección 3.7) y lo que ya está en main con las Fases 0 y 1. Aquí van la división en entregas, el orden de las pantallas, los ajustes al modelo que salieron de revisar las capturas y los HTML, y los puntos donde un diseño choca con el CLAUDE.md o con otro diseño.

Pantallas revisadas: Panel-Inicio, Viaje-Completo, CotizacionBuilder-v3, Armador-Agregar, Cotizacion-Enviar, CotizacionCliente-Movil-v4 (opciones, una estancia y dos estancias), SistemaPropuesta-v4 y Sistema-Mapa.

---

## 1. Dos entregas: sí, con un ajuste

Estoy de acuerdo con dividirla. El armador solo ya es más grande que toda la Fase 1, y así puedes probar cómo se arma una cotización antes de que exista la vista del cliente.

El ajuste: el **tipo de cambio de Banxico** entra en 2a y no en 2b, porque el armador lo necesita en cuanto una tarifa viene en dólares o euros.

| Entrega | Qué incluye | Al terminar ya se puede |
|---|---|---|
| **2a · Armar** | Viajes, nuevo viaje, el viaje con sus pestañas, el armador con «Agregar servicio» (hotel, vuelo, actividad y servicio) y el FIX diario de Banxico | Crear un viaje, armarle la cotización completa con opciones o estancias, ver totales, ganancia y pendientes. Todavía no se envía |
| **2b · Enviar** | Revisar y enviar, la propuesta del cliente en sus tres formas, visitas al enlace, «Escribir a mi asesora» y «Confirmar selección» | Mandar la liga por WhatsApp, que el cliente la abra en su celular, compare, pregunte o confirme, y ver en el panel quién la abrió y qué vio |

Cada entrega va en su propio PR, termina con capturas en `fase-2/capturas/` y la liga de Vercel para probarla. El PR de 2b sale de main después de que apruebes y se una el de 2a.

---

## 2. Orden de las pantallas

### Entrega 2a

| # | Pantalla | Diseño | Al terminar ya se puede |
|---|---|---|---|
| 1 | **Modelo y reglas de dinero** | — | Tablas de viajes y cotizaciones, cálculo de precio, ganancia, tipo de cambio e IVA con pruebas. Todo lo demás se apoya aquí |
| 2 | **Tipo de cambio** | — | FIX de Banxico diario guardado con fecha. Si no llega, el Dueño lo captura a mano en Configuración › Precios |
| 3 | **Viajes** | Panel-Inicio | Lista con fechas, etapa, inversión, última actividad y a cargo; filtros; panel lateral con nota interna y actividad; el buscador ya encuentra viajes por cliente o folio |
| 4 | **Nuevo viaje** | Sin diseño (ver 5.1) | Cliente (nombre y WhatsApp), destino, de dónde sale, fechas, adultos, menores con su edad y quién lo atiende |
| 5 | **El viaje** | Viaje-Completo | Encabezado, barra de etapas, «Turno de Airoo», servicios por sección, Dinero, Actividad e Historial. Validación, Reservas, Documentos y Pagos aparecen apagadas con «Disponible cuando…», como en el prototipo |
| 6 | **Armador** | CotizacionBuilder-v3 | Hospedaje con opciones o estancias, vuelos, actividades y servicios; costo neto, moneda, utilidad, pago y cancelación por servicio; total por opción; «Antes de enviar»; ajustes de la cotización; se guarda solo |
| 7 | **Agregar servicio** | Armador-Agregar | Buscar en el catálogo por tipo (H, V, A, S); dar de alta lo que no existe con nombre y ciudad; habitaciones, camas y personas; acuerdo propuesto con el último de ese proveedor |
| 8 | **Pruebas, capturas y liga** | — | Cierre de 2a |

### Entrega 2b

| # | Pantalla | Diseño | Al terminar ya se puede |
|---|---|---|---|
| 1 | **Propuesta del cliente** | CotizacionCliente-Movil-v4 y sus variantes | Liga con token, las tres formas de hospedaje elegidas solas, vuelos, actividades, servicios, Inversión con «Tu hotel», condiciones de pago, «Qué pasa si cancelo», términos, fotos, comparar hoteles, compartir |
| 2 | **Dudas y confirmación** | Bandejas de la v4 | «Escribir a mi asesora» con temas y fechas; «Confirmar selección» registra el hotel elegido y el viaje pasa a Aprobada · Por revalidar |
| 3 | **Revisar y enviar** | Cotizacion-Enviar | Lo que impide enviar y los avisos, vigencia, mensaje de WhatsApp en tres versiones, abrir WhatsApp, copiar enlace y «¿Le diste enviar?» |
| 4 | **Visitas y seguimiento** | Panel-Inicio, Viaje-Completo | Quién abrió el enlace, cuántas veces, qué vio más; «Ver como Nataly» y «Vista previa» sin contar como visita; «Solicitud de cambios» en la lista |
| 5 | **Versión 2** | — | Editar una cotización ya enviada crea la versión 2 (ver 6.2) |
| 6 | **Pruebas, capturas y liga** | — | Cierre de 2b |

La propuesta va primero en 2b porque «Revisar y enviar» muestra una vista previa de ella.

---

## 3. Ajustes al modelo de datos

Son cambios sobre lo aprobado en la sección 3.7. Ninguno guarda precios en un catálogo.

**3.1 La liga es del viaje, no de cada versión.** El modelo aprobado ponía `token_enlace` en `cotizaciones`. Los diseños dicen que el cliente usa siempre la misma liga: «Si la editas después, Nataly ve la versión nueva», y el Mapa dice que Datos y pago se habilita en el mismo enlace. El token pasa a `viajes.token_cliente`.

**3.2 Edades de los menores desde la cotización.** «Revisar y enviar» no deja enviar si faltan, porque hoteles y parques cobran por edad. Se agrega `viajes.edades_menores` (lista de números). Los nombres de los viajeros siguen llegando en Datos y pago (Fase 3).

**3.3 Opciones o estancias.** La v4 elige sola entre tres formas: varias opciones para las mismas fechas, una estancia, o varias estancias en fechas seguidas. En el modelo: las partidas de hotel con `opcion_id` son opciones; sin `opcion_id`, son estancias ordenadas por fecha. `cotizacion_opciones` suma `recomendada`. Una cotización usa opciones o estancias, no las dos (ver 5.4).

**3.4 Habitaciones con adultos y menores.** La propuesta muestra «2 adultos + 1 menor» por habitación. `partida_habitaciones` cambia `personas` por `adultos` y `menores`, y guarda su propio `neto` y `reembolsable`, como en Armador-Agregar. Si el viaje no dice cómo se reparten, cada habitación empieza en 4 personas. Lista fija de camas, la de Armador-Agregar: King, Queen, 2 Queen, 2 dobles, King + sofá cama, 2 dobles + sofá cama, Matrimonial, 2 individuales.

**3.5 El acuerdo de cada reserva, con los nombres del diseño.** En cada partida: `pago_proveedor` (`al_reservar` | `anticipo` | `en_el_lugar`), `anticipo_proveedor_pct`, `pagar_antes`, `cancelacion_gratis_hasta`, `cancelacion_texto` y `reembolsable`. «Lo propone el último acuerdo con ese proveedor»: mientras no haya reservas (Fase 4), sale de la última cotización con ese proveedor y lo dice así.

**3.6 Utilidad heredada o a mano.** `partidas.utilidad_manual` indica si se cambió a mano; si no, sigue la utilidad base de la cotización. En vuelos la utilidad es fija (2.5% de Configuración) y no se edita.

**3.7 Tipo de cambio sin decimales flotantes.** Tabla `tipos_cambio` (`fecha`, `moneda`, `fix`). El FIX y el tipo de cambio con colchón se guardan en diezmilésimos enteros (18.4200 → 184200), con la fecha del FIX en la cotización.

**3.8 Traslados con trayectos.** Un traslado puede ser solo ida, solo regreso, redondo o de varios trayectos («Cancún → Tulum»). Tabla nueva `partida_trayectos`: `desde`, `hasta`, `fecha`, `hora` y, si se liga a un vuelo, `vuelo_tramo_id` para mostrar «Llega VB 2124 · 7:26 PM».

**3.9 Una nota para el cliente por sección.** La regla de la v4 es «una nota por sección como máximo, con barra azul». `cotizaciones.notas` guarda la de Hospedaje, Vuelos, Actividades y Servicios. Las inclusiones de cada actividad siguen en su partida.

**3.10 Cargo por servicio y mensaje.** La cotización copia de Configuración el cargo por servicio ($250) al crearse, para que cambiar el ajuste no mueva cotizaciones hechas. También guarda `plantilla_mensaje`, `enviada_en` y `enviada_por` (al contestar «Sí, ya la envié»).

**3.11 Visitas y lo que más vio.** `enlace_visitas` suma `secciones` (segundos en Hospedaje, Vuelos, Actividades, Servicios e Inversión) para el «Lo que más vio» del panel. Las visitas del equipo, de «Ver como Nataly» o de la vista previa no cuentan.

**3.12 Selección y dudas del cliente.** «Confirmar selección» guarda `aceptada_en` y `opcion_elegida_id` en la cotización. `solicitudes_cambio` suma `fechas_flexibles` («Mis fechas son flexibles»).

**3.13 Folio consecutivo.** Una secuencia en la base que empieza en AIR-1001 para los viajes reales. Los viajes de ejemplo conservan sus folios de los prototipos (AIR-2458) y no mueven el consecutivo.

**3.14 «Eliminar solo si nunca se usó» empieza a contar.** Desde 2a, un hotel, actividad, servicio, aerolínea o proveedor usado en una cotización ya no se puede eliminar, solo archivar. «Usado en N viajes» deja de mostrar 0.

**3.15 Datos de ejemplo.** El viaje de Nataly Cervantes (AIR-2458) con las tres opciones de los prototipos, y dos viajes más con nombres genéricos para ver una estancia y dos estancias (Cancún y Tulum). Se agrega Iberostar Selection Cancún, que falta en el catálogo. Como el Supabase de producción es el mismo que usas para probar, los viajes de ejemplo llevan la etiqueta «Ejemplo» y se pueden borrar todos con un botón en Configuración cuando empieces a usarlo de verdad.

---

## 4. Donde el diseño choca con el CLAUDE.md

Según el CLAUDE.md, manda el CLAUDE.md y se pregunta. Así lo resolvería; confírmalo o cámbialo.

**4.1 Cotizaciones e Itinerarios.** Inicio tiene pestañas «Cotizaciones · Itinerarios» y «Nuevo viaje» pregunta cuál de los dos. El CLAUDE.md dice que no hay tipos. Propuesta: una sola lista de viajes y «Nuevo viaje» sin esa pregunta. La propuesta día por día sigue pendiente de diseño.

**4.2 La liga con el folio.** El mensaje de WhatsApp y «Copiar enlace» usan `airoo.mx/c/AIR-2458`. Propuesta: la liga lleva el token (`…/c/k8Fq2…`); el folio solo se muestra.

**4.3 Tripadvisor «de la API».** SistemaPropuesta-v4 dice que la calificación se consulta cada vez desde la API, que no se puede guardar y que el logo y las burbujas deben ser las imágenes de la API. El CLAUDE.md dice captura a mano, sin API. Las reglas de Tripadvisor existen justamente para que nadie muestre sus burbujas con datos guardados por fuera. Propuesta: mostrar «4.5 de 5 en Tripadvisor · 3,106 opiniones» en texto, sin logo ni burbujas, y ocultar la línea si el hotel no tiene calificación.

**4.4 Precios en el catálogo.** En «Agregar servicio», los servicios dicen «Neto $2,300», «Neto $310 p/p», «Neto $180 p/p» y «Sin tarifa en catálogo»; los boletos de Xcaret llegan con precio. El CLAUDE.md dice que ningún catálogo guarda precios. Propuesta: el costo neto siempre llega vacío y se captura en cada cotización. De la ficha solo vienen nombres, edades de boletos, unidades y planes.

**4.5 «Buscar vuelo» por número.** Armador-Agregar llena ruta y horarios con el número de vuelo («Encontrado»), y eso necesita un servicio externo de vuelos. Sin API en esta versión. Propuesta: se captura a mano, y si ese número de vuelo ya se capturó en otro viaje, el armador ofrece copiar su ruta y horario.

**4.6 Recordatorios «por WhatsApp».** Enviar dice «Se le recuerda a Nataly un día antes, por WhatsApp»; el viaje dice «Recordatorio por WhatsApp 3 días antes de cada pago»; Inicio tiene «Recordar por WhatsApp». Sin API de WhatsApp, el sistema no puede mandarlos solo. Propuesta: «Recordar por WhatsApp» abre WhatsApp con el mensaje escrito (liga wa.me) y la asesora le da enviar. Los textos cambian a «Se te avisa un día antes para recordárselo» y el aviso llega en Avisos (Fase 4).

**4.7 «Escribir a mi asesora» con aviso por WhatsApp.** El Mapa dice que la solicitud de cambios avisa por WhatsApp. Propuesta: la duda se guarda en el viaje, el viaje dice «Solicitud de cambios» en Viajes y en su Actividad, y el cliente ve «Mensaje enviado». Sin mensaje automático.

**4.8 Recordatorios «3 días antes y el mismo día».** El viaje dice eso, pero Configuración (aprobada) dice «3 días y 1 día antes». Propuesta: el texto sale del ajuste de Configuración.

**4.9 «Administrador».** «Tu cuenta», «Dinero · Solo administradores». Se muestra «Dueño», y Dinero dice «Solo el equipo a cargo», porque la asesora también lo ve en sus viajes.

---

## 5. Huecos y diferencias entre diseños

No chocan con el CLAUDE.md, pero no se pueden programar tal como están. Tomo esto por default.

**5.1 Nuevo viaje y Clientes no tienen diseño.** El Mapa los marca por rediseñar. Propuesta: una ventana con el estilo del panel: cliente (busca por nombre o WhatsApp, o lo da de alta), destino, sale de, fechas, adultos, menores con edad, quién lo atiende. La ficha del cliente sigue pendiente.

**5.2 El viaje en etapa Cotización no está dibujado.** Viaje-Completo empieza en Aprobada. Propuesta: misma vista, con «Turno de Airoo · Cotización en borrador» y botón «Abrir armador», o «Con el cliente · enviada el …» después de enviarla.

**5.3 Nombres de etapas distintos.** Inicio dice Propuesta, Confirmando, Reservando, Confirmado; el viaje dice Cotización, Aprobada, En reservación, Reservada. Propuesta: los del viaje en todos lados (son los del modelo aprobado). La línea de abajo se calcula: «Sin enviar», «Con el cliente», «Solicitud de cambios», «Por revalidar».

**5.4 Opciones dentro de estancias.** Ningún diseño muestra dos estancias con opciones cada una. Propuesta: una cotización lleva opciones o estancias. Si se intenta mezclar, el armador lo explica: «Con varias estancias, cada una lleva un solo hotel».

**5.5 Costo del hotel por habitación o total.** El armador tiene un solo «Costo neto»; Agregar servicio pide precio y «Reembolsable» por habitación. Propuesta: por habitación (pueden ser tarifas distintas), y el armador muestra la suma.

**5.6 Moneda en el armador.** Agregar servicio muestra moneda, FIX con colchón y neto en pesos; el armador no. Propuesta: el panel de precio del armador muestra «US$1,980 · 18.70 por dólar» cuando la tarifa no es en pesos.

**5.7 Cargo por servicio en el armador.** El cliente ve $250 de cargo por servicio, pero el total del armador no lo suma. Propuesta: una línea «Cargo por servicio» en «Total por opción». El IVA, si se activa, va sobre todo, incluido el cargo.

**5.8 Lo que se paga en el lugar.** Si un servicio se paga «En el lugar» o con anticipo al proveedor, el armador separa «Pagos a Airoo» y «En destino, al proveedor», pero la propuesta del cliente no lo menciona. Propuesta: en Inversión, una línea «Se paga en el lugar, directo al proveedor» con el monto y el servicio, y el plan de pagos solo cubre lo que se le paga a Airoo.

**5.9 Una nota por hotel o por sección.** El armador tiene «Nota para el cliente» en cada hotel; la v4 permite una cursiva por sección. Propuesta: una por sección (ver 3.9).

**5.10 «Cómo verá el cliente esta sección».** El armador deja elegir «foto cuadrada» o «banner»; la v4 dice que el componente se elige solo. Propuesta: quitar ese selector.

**5.11 Utilidad 8, 10, 12, 15.** El armador ofrece 8/10/12/15% y Agregar servicio 8/10/12%. Propuesta: 8/10/12/15% en los dos, y la base sale de Configuración.

**5.12 Camas «Twin doble» y «Cama King».** No están en la lista fija. Se usa la lista de 3.4.

**5.13 Hotel solo para adultos.** El prototipo no deja agregar un hotel solo para adultos si viajan menores. Propuesta: lo mismo, con el texto «Este hotel es solo para adultos y en el viaje van 2 menores».

**5.14 Logo del parque.** Las actividades no tienen campo de logo. Propuesta: el encabezado usa la portada de la actividad; si no tiene, el bloque de color con el nombre, como en el prototipo.

**5.15 Cotización vencida.** El enlace vencido está pendiente de diseño. Propuesta: la misma propuesta con «Precios por actualizar», sin «Confirmar selección» y con «Escribir a mi asesora».

**5.16 «Próximos 7 días» y «eventos hoy» en Inicio.** Dependen de check-ins, pagos y avisos de las Fases 3 a 5. Propuesta: en 2a solo la vista de lista; esa vista llega con Avisos en la Fase 4.

---

## 6. Lo que necesito que decidas

Cuatro reglas que los diseños no definen o definen de dos formas. Cada una trae mi recomendación; si estás de acuerdo con las cuatro, basta con decir «aprobada».

**6.1 Fechas del plan de pagos.** El prototipo de Nataly pone el pago final el Lun 12 oct, dos días antes de pagarle a Seadust (Mié 14 oct), y el segundo pago una semana antes. Configuración dice «Pagos flexibles: liquidar 15 días antes del viaje», que sería el Mar 6 oct.
- **A (recomendada):** como el prototipo. El pago final vence 2 días antes de la fecha en que Airoo le paga al hotel y el segundo pago una semana antes. El ajuste de 15 días se usa solo si el hotel no tiene fecha de pago.
- **B:** como Configuración. Todo liquidado 15 días antes del viaje.

**6.2 Cuándo hay pagos flexibles.** Propuesta: el anticipo cubre todo lo que se paga al reservar (vuelos, actividades, traslados, seguro) y el cargo por servicio; el hotel se divide en dos pagos solo si su tarifa tiene cancelación gratis y su fecha de pago deja tiempo. Si no, va completo en el anticipo y queda «Pago único». En un viaje de solo hospedaje, el hotel se divide en tres partes iguales y la primera más el cargo por servicio forman el anticipo.

**6.3 Editar una cotización ya enviada.** Enviar dice «Si la editas después, Nataly ve la versión nueva».
- **A (recomendada):** editar crea un borrador de versión 2; Nataly sigue viendo la 1 hasta que se envíe la 2 desde «Revisar y enviar». Así nunca ve algo a medias.
- **B:** como dice el prototipo, cada cambio guardado se ve de inmediato.

**6.4 Quién edita la cotización de otra asesora.** La asesora ve todos los viajes, pero no los costos de los ajenos, y sin costos no puede usar el armador. Propuesta: la asesora edita y envía solo sus viajes; los demás los ve en Resumen sin costos. El Dueño edita todos y puede cambiar quién lo atiende.

---

## 7. Permisos de la Fase 2

Se agregan a `src/lib/permisos.ts`, sin cambiar la matriz aprobada.

| Acción | Dueño | Asesora | Contador |
|---|---|---|---|
| Ver la lista de viajes y el Resumen | Sí | Sí, todos | Sí, sin editar |
| Crear un viaje | Sí | Sí, queda a su cargo | No |
| Editar la cotización y enviarla | Sí | Solo sus viajes | No |
| Ver costo neto, utilidad y ganancia | Sí | Solo sus viajes | Sí |
| Cambiar quién atiende el viaje | Sí | No | No |
| Escribir notas internas | Sí | Sí | Sí |
| Dar de alta hotel, actividad o servicio desde el armador | Sí | Sí | No |
| Capturar el FIX a mano | Sí | No | No |

Lo que no se puede ver no se manda al navegador: un viaje ajeno llega a la asesora sin netos ni utilidad desde el servidor.

---

## 8. Pruebas que demuestran las reglas

**Reglas (Vitest)**
- Precio = neto en pesos × (1 + utilidad), redondeado a centavos: $2,683 al 2.5% da $2,750.08, como el prototipo.
- Tarifa en dólares: neto × (FIX + 1.5%) con el FIX y su fecha guardados; cambiar el colchón en Configuración no mueve cotizaciones hechas.
- Cambiar la utilidad base mueve solo las partidas que no se cambiaron a mano; los vuelos se quedan en 2.5%.
- IVA solo si se activa, y sobre todo incluido el cargo por servicio.
- Plan de pagos de Nataly: anticipo $18,048.48, segundo pago $12,100, pago final $12,100, con las fechas de la regla que elijas en 6.1.
- «Antes de enviar»: falta de costo neto, de fecha, de huéspedes o de edades impide enviar; falta de fotos solo avisa.
- Vigencia: nunca pasa del día antes del pago del hotel.
- La liga solo abre con el token; con el folio da «no encontrado».
- Las visitas del equipo no cuentan.
- La asesora no recibe netos ni utilidad de viajes ajenos.
- Un hotel usado en una cotización ya no se puede eliminar.

**Navegador (Playwright)**
- 2a: crear el viaje de Nataly, agregar tres hoteles como opciones (uno nuevo con nombre y ciudad, que queda «Por completar»), vuelo redondo, Xel-Há con boletos por edad, traslado redondo ligado al vuelo y seguro; ver que el total por opción cuadra y que «Antes de enviar» se vacía al resolver cada pendiente.
- 2b: enviar, abrir la liga en tamaño celular, comparar hoteles, elegir uno en Inversión y confirmar; ver en el panel la visita, la selección y el viaje en Aprobada · Por revalidar. Lo mismo con una estancia y con dos.

---

## 9. Lo que necesito de ti para 2a

- **Un token gratuito de Banxico** para el FIX diario. Se pide en el portal SIE de Banxico con tu correo; te paso los pasos cuando apruebes y lo pegas tú directo en Vercel, nunca en el chat. Mientras no esté, el FIX se captura a mano en Configuración y el armador dice de qué fecha es.

---

## 10. Decisiones que tomé por default (cámbialas si no van)

- Con el FIX de Banxico se usa el último publicado (sale cerca del mediodía); la cotización dice su fecha.
- La tarea diaria del FIX corre en Vercel una vez al día, que es lo que permite el plan gratuito.
- «Confirmar selección» en 2b solo registra la elección y avisa en el viaje; la pantalla «Confirmando tu selección» y la validación son de la Fase 3.
