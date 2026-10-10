# Plan de construcción

Cada fase termina con algo que ya se puede usar. Pantallas de referencia entre paréntesis (están en `disenos/capturas/`).

## Fase 0 · Base
- Proyecto, base de datos, inicio de sesión y roles (Dueño, Asesora, Contador).
- Layout del panel: barra lateral, buscador, avisos vacíos.
- Lista de ciudades compartida.

## Fase 1 · Catálogos
- Proveedores (Catalogo-Proveedores): plataformas y directos, contactos, cuentas donde reciben con verificación por llamada, nota interna, «últimos acuerdos» (vacío hasta que haya reservas).
- Hoteles + ficha (Catalogo-Hoteles, Hotel-Ficha): alta con nombre y ciudad, portada 16:9 con encuadre, galería, fotos por habitación, archivar con confirmación, unir duplicados.
- Actividades + ficha (Catalogo-Actividades, Actividad-Ficha): base + bloques opcionales.
- Servicios y Aerolíneas (Catalogo-Servicios, Catalogo-Aerolineas). Lista de aerolíneas por código IATA cargada una vez.
- Configuración (Configuracion): precios, cobros, pagos a proveedores, datos y horario, equipo y comisión, bitácora.

## Fase 2 · Cotizar
- Viajes (Panel-Inicio) y el viaje con sus pestañas (Viaje-Completo).
- Armador (CotizacionBuilder-v3) y agregar servicio (Armador-Agregar): hotel, vuelo, actividad, servicio; plataforma, moneda, camas, personas y acuerdo de cada reserva.
- Revisar y enviar (Cotizacion-Enviar): enlace único + mensaje de WhatsApp (liga wa.me, sin API).
- Propuesta del cliente (CotizacionCliente-Movil-v4, -UnaEstancia, -DosEstancias).

## Fase 3 · Confirmar y cobrar
- Confirmando y precio actualizado (CotizacionCliente-Movil-v4-Confirmando).
- Validar y aprobar (Viaje-Validar): tolerancia de $300, versión 2.
- Datos y pago (CotizacionCliente-Movil-v4-DatosPago) y enlace del pasajero (CotizacionCliente-Movil-v4-EnlacePasajero).
- Confirmación de pagos con CEP.

## Fase 4 · Reservar y operar
- Reservas, documentos y pagos del viaje (Viaje-Reservas).
- Finanzas (Panel-Finanzas): por cobrar, por pagar, utilidad, comisión de asesoras.
- Avisos y preferencias (Avisos, Avisos-Preferencias).

## Fase 5 · Viaje y cierre
- Viaje confirmado del cliente con Agenda (CotizacionCliente-Movil-v4-ViajeConfirmado).
- Cancelar viaje (Viaje-Cancelar) con cargo por cancelación combinado.

## Pendiente de diseño (se diseña en paralelo)
Clientes y su ficha, formulario de solicitud, plantillas de WhatsApp, extender plazo, cambio de horario de vuelo, enlace vencido, viaje finalizado o cancelado del lado del cliente, incidencias, buscador ⌘K.
