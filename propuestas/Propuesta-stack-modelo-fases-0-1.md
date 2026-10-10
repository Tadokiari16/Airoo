# Airoo · Stack, modelo de datos y tareas de las Fases 0 y 1

**Aprobada por Luis el 10 oct 2026, con los cambios que ya están aplicados aquí y en el CLAUDE.md.**
Repo: `github.com/Tadokiari16/Airoo` (hoy vacío).

Contenido:
1. Stack
2. Convenciones del modelo
3. Modelo de datos completo, por módulo
4. Relaciones principales
5. Tareas de la Fase 0
6. Tareas de la Fase 1
7. Decisiones que tomé por default

---

## 1. Stack

Coincido con tu preferencia. No encontré una razón fuerte para cambiarla.

| Pieza | Elección | Por qué |
|---|---|---|
| Aplicación | **Next.js (App Router) + TypeScript** | Un solo proyecto sirve el panel (escritorio, 1440 px) y la vista del cliente (móvil, 390 px). La vista del cliente carga rápido cuando la abren desde WhatsApp. |
| Base de datos | **Supabase Postgres** | Postgres maneja bien dinero exacto, fechas, búsqueda sin acentos (`unaccent`) y nombres parecidos (`pg_trgm`, para el aviso de ciudades y hoteles duplicados). |
| Inicio de sesión | **Supabase Auth** | Correo + contraseña, recuperar contraseña e invitaciones con rol. |
| Archivos | **Supabase Storage** | Portadas, galerías y fotos por habitación (Fase 1); bonos, pólizas, comprobantes y CEP (Fases 3 y 4). Fotos y documentos internos en buckets privados con ligas temporales. |
| Acceso a datos | **Drizzle ORM** + migraciones en el repo | El esquema vive en TypeScript y cada cambio queda versionado. |
| Estilos | **Tailwind CSS** | Colores, radios y tamaños tomados de las capturas como variables, para copiar fiel el diseño. |
| Hospedaje | **Vercel** | Cada cambio genera una liga de vista previa para revisar antes de publicar. |
| Tareas programadas | **Vercel Cron** | Solo dos: el FIX diario de Banxico y los avisos de pago. El plazo de Datos y pago se calcula al abrir el enlace. |
| Pruebas | **Vitest** (reglas de dinero y permisos) + **Playwright** (flujos en navegador) | Las reglas del CLAUDE.md quedan probadas desde el principio. |

Integraciones externas, todas sin API de pago: FIX de Banxico (API pública SIE, con token gratuito), CEP de Banxico (se consulta en su portal, el sistema solo guarda el resultado), WhatsApp con ligas `wa.me` (sin API). RateHawk y TBO quedan apagados, como pide el CLAUDE.md.

Tipografía: Plus Jakarta Sans en el panel y Gilroy en la vista del cliente, con los archivos guardados en el repo (sin servicios externos).

---

## 2. Convenciones del modelo

- **Dinero**: entero en centavos + moneda (`MXN`, `USD`, `EUR`). Nunca decimales flotantes. La moneda vive en cada tarifa, no en el hotel ni en el proveedor.
- **Tipo de cambio**: cada cotización guarda el FIX del día, su fecha y el colchón aplicado. Cambiar la configuración no altera cotizaciones ya hechas.
- **Ningún catálogo guarda precios.** Los precios solo existen en las partidas del armador.
- **Archivar, no borrar**: cada catálogo tiene `archivado_en`. Eliminar solo se permite si el registro nunca se usó.
- **Quién y cuándo**: todas las tablas llevan `creado_en`, `creado_por`, `actualizado_en`. Los cambios relevantes quedan en `bitacora` o en el historial del viaje.
- **Fechas** en zona horaria de Cancún (`America/Cancun`). Formato en pantalla «Mié 21 oct».
- **Texto libre** donde el diseño lo pide (duración de actividades, horarios de contacto).

---

## 3. Modelo de datos completo

Marco con **(F0)** … **(F5)** la fase en que se crea cada tabla. Las de Fase 0 y 1 están detalladas campo por campo; las demás llevan sus campos clave y se afinan al empezar su fase.

### 3.1 Equipo, acceso y agencia

**usuarios** (F0): `id` (= cuenta de Supabase Auth), `nombre`, `iniciales` («TÚ», «A2»), `correo`, `whatsapp`, `rol` (`dueno` | `asesora` | `contador`), `activo`, `ultimo_acceso`.

**invitaciones** (F0): `correo` o `whatsapp`, `rol`, `invitado_por` → usuarios, `estado` (`pendiente` | `aceptada` | `vencida` | `cancelada`), `vence_en`.

**configuracion** (F0 la tabla, F1 la pantalla): una fila por ajuste (`clave`, `valor` JSON, `actualizado_por`). Guarda: ganancia por defecto por tipo (hoteles sobre neto de plataforma; actividades y traslados; vuelos 2.5% fija), cargo por servicio, IVA 16% solo con factura, tolerancia ($300 por servicio), colchón de tipo de cambio (1.5%), plazo de Datos y pago (3 h), vigencia máxima de la cotización, liquidar pagos flexibles 15 días antes, aviso a proveedores (1 día antes), recordatorios al cliente (3 días y el mismo día), comisión de Airoo (35%), datos de la agencia (nombre comercial, WhatsApp, horario, emergencias).

**cuentas_cobro_airoo** (F1): CLABE donde los clientes pagan. `banco`, `clabe` (cifrada), `ultimos4`, `principal`, `estado` (`verificada` | `por_activar`), `activa_desde` (un cambio se confirma con código por correo o con la contraseña del Dueño, y se activa 24 h después).

**formas_pago_airoo** (F1): con qué paga Airoo a proveedores. `tipo` (`tarjeta` | `cuenta`), `nombre` («Tarjeta Airoo»), `banco`, `ultimos4`, `uso` (crédito, SPEI), `activa`.

**tipos_cambio** (F2): `fecha`, `moneda`, `fix` (Banxico). Se llena solo cada día hábil.

**bitacora** (F0): `cuando`, `quien` → usuarios, `texto` («Tolerancia de precio: $300 por servicio»), `entidad`, `entidad_id`, `antes`, `despues`. Se conserva un año y se exporta a CSV.

### 3.2 Ciudades

**ciudades** (F0): `nombre` («Cancún»), `region` («Quintana Roo», «Tenerife»), `pais` («México», «España»), `nombre_busqueda` (sin acentos ni mayúsculas), `archivado_en`.
- Hay ciudades fuera de México (Barcelona, Val Gardena, Kioto), así que `pais` es obligatorio.
- Único por `nombre_busqueda + region + pais`. Al agregar, `pg_trgm` encuentra parecidas («San Cristóbal» en Chiapas, Táchira y Tenerife) y se avisa antes de crear.
- Solo el Dueño agrega. La comparten hoteles, actividades, servicios y viajes.

### 3.3 Proveedores (F1)

**proveedores**: `nombre`, `tipo` (`plataforma` | `directo`), `que_le_compras` (texto: «Hoteles y traslados»), `categorias` (hoteles, traslados, tours, seguros…), `sitio` y `numero_agencia` (solo plataformas; usuario y contraseña no se guardan), `razon_social`, `nota_interna`, `desde`, `archivado_en`.

**proveedor_contactos**: `proveedor_id`, `nombre`, `para_que` («Ventas», «Reservas», «Pagos», «Emergencias»), `whatsapp`, `correo`, `horario` (texto), `principal`.

**proveedor_cuentas**: dónde recibe. `proveedor_id`, `tipo` (`clabe` | `tarjeta` | `otro`), `banco`, `a_nombre_de`, `numero` (cifrado), `ultimos4`, `estado` (`pendiente` | `verificada` | `rechazada`), `verificada_por`, `verificada_en`, `telefono_llamada` (el número que ya estaba registrado), `confirmo_por_telefono`, `estado_cuenta_coincide`, `reemplaza_a` → proveedor_cuentas, `primer_pago_revisado`.

«Últimos acuerdos» no es tabla: se consulta de las reservas (3.8) de ese proveedor.

### 3.4 Hoteles (F1)

**hoteles**: `nombre`, `ciudad_id`, `descripcion` (máx. 400), `regimenes` (solo habitación, desayuno, media pensión, pensión completa, todo incluido), `direccion`, `liga_maps`, `telefono_publico`, `tripadvisor_id`, `tripadvisor_calificacion` y `tripadvisor_opiniones` (se capturan a mano, sin API), `llegada_desde`, `salida_hasta`, `edad_menores_de`, `edad_menores_a`, `llegada_anticipada`, `reglas`, `telefono_reservaciones`, `correo_reservaciones`, `nota_interna`, `solo_adultos`, `archivado_en` + `motivo_archivo`, `unido_a` → hoteles (para duplicados).
- «Por completar» se calcula: falta portada, fotos, habitaciones, descripción, ID de Tripadvisor, cargos o nombres de proveedor.

**hotel_fotos**: `hotel_id`, `habitacion_id` (vacío = galería de la propiedad), `archivo`, `ancho`, `alto`, `orden`, `es_portada`, `encuadre` (recorte 16:9 elegido). Aviso si la portada mide menos de 1600×900 o es cuadrada.

**hotel_habitaciones**: `hotel_id`, `nombre_cliente` («Suite Deluxe vista al mar»), `orden`. Sin camas ni personas: eso se elige en el armador.

**hotel_habitacion_nombres**: el nombre que usa cada plataforma. `habitacion_id`, `proveedor_id`, `nombre` («Two Bedroom Family Suite»).

**hotel_cargos**: lo que se paga en el hotel. `hotel_id`, `concepto` («Derecho de saneamiento ambiental»), `monto`, `moneda`, `se_cobra` (por habitación por noche, por persona por noche, por estancia).

**hotel_proveedores**: dónde se puede reservar. `hotel_id`, `proveedor_id`, `id_externo` (opcional).

### 3.5 Actividades (F1)

**actividades**: `nombre`, `ciudad_id`, `tipo` (tour, excursión, parque o entrada, day pass, experiencia, espectáculo, otro), `duracion` (texto libre), `descripcion`, `nota_interna`, `se_paga_en_lugar` (lo paga el cliente ahí, sin proveedor), `archivado_en`.
- Los 8 bloques opcionales: `bloques` (lista de encendidos) y sus datos:
  - Cómo se cobra: `cobro` (`persona` | `edad` | `grupo` | `unidad`), `max_personas_grupo`.
  - Horarios: `horario_tipo` (`abierto` | `salidas`), `horario_texto`.
  - Cómo llega el cliente: `llegada` (`recogida` | `punto_encuentro` | `por_su_cuenta`), `punto_encuentro`.
  - Incluye / no incluye / qué llevar: tres textos.
  - Requisitos: texto.
  - Cómo se confirma: `confirmacion` (`bono` | `lista_nombres` | `pago_taquilla`).

**actividad_planes**: `actividad_id`, `nombre` («Plus»), `incluye`, `orden`.
**actividad_boletos**: `actividad_id`, `nombre` («Niño»), `edad_desde`, `edad_hasta`, `gratis`, `orden`.
**actividad_salidas**: `actividad_id`, `hora`.
**actividad_fotos**: igual que hotel_fotos (portada 16:9 + galería).
**actividad_proveedores**: `actividad_id`, `proveedor_id`, `id_externo`, `contacto_id` (opcional). Se ligan, no se copian.

### 3.6 Servicios y aerolíneas (F1)

**servicios**: `nombre` («Traslado privado · Aeropuerto de Cancún»), `tipo` (traslado, seguro, conectividad, equipo, reservación), `destino` (texto: «Cancún y Riviera Maya»), `ciudad_id` opcional, `modelo_cobro` (`vehiculo` | `persona` | `persona_dia` | `unidad` | `dia` | `fijo`), `descripcion`, `cliente_recibe` («Póliza en PDF y asistencia 24 h»), `en_viaje_confirmado` (lo que ve el cliente), `nota_interna`, `archivado_en`.
**servicio_variantes**: unidades, planes o tipos. `servicio_id`, `nombre` («Van adaptada», «Plus»), `pasajeros`, `maletas`, `detalle` («rampa», «Hasta USD 60,000»), `orden`.
**servicio_proveedores**: `servicio_id`, `proveedor_id`, `id_externo`.

**aerolineas**: `iata` («VB»), `nombre`, `logo`, `sitio`, `como_se_compra`, `nota_interna`. La lista IATA se carga una vez.
**aerolinea_tarifas**: `aerolinea_id`, `nombre` («Switch»), `mano`, `documentada` («15 kg»), `cambios`, `orden`.
**aerolinea_checkin**: `aerolinea_id`, `ruta` (`nacional` | `internacional`), `abre`, `cierra`, `fuente` (`verificado` | `terceros` | `sin_fuente`), `fuente_texto`, `verificado_por`, `verificado_en`.

### 3.7 Clientes, viajes y cotizaciones (F2)

**clientes**: `nombre`, `whatsapp`, `correo`, `nota_interna`. (La ficha de cliente sigue pendiente de diseño; la tabla existe para ligar viajes.)

**viajes**: `folio` («AIR-2458», consecutivo, solo se muestra), `cliente_id`, `a_cargo` → usuarios, `ciudad_destino_id`, `ciudad_salida_id`, `inicio`, `fin`, `adultos`, `menores`, `etapa` (`cotizacion` | `aprobada` | `datos_y_pago` | `en_reservacion` | `reservada` | `en_viaje` | `finalizada` | `cancelada`), `subetapa` («Por revalidar», «Con el cliente»), `plazo_datos_pago` (vence en), `nota_interna`.

**cotizaciones**: una por versión. `viaje_id`, `version`, `estado` (`borrador` | `enviada` | `aceptada` | `reemplazada`), `valida_hasta`, `utilidad_base_pct`, `con_iva`, `cargo_por_servicio`, `fix_usd`, `fix_eur`, `fix_fecha`, `colchon_pct`, `token_enlace` (aleatorio largo: airoo.mx/c/k8Fq2…; nunca el folio), `enviada_en`, `enviada_por`, `aceptada_en`, `opcion_elegida_id`.

**cotizacion_opciones**: las opciones de hotel. `cotizacion_id`, `nombre`, `orden`, `archivada_al_aprobar`.

**partidas**: cada servicio cotizado. `cotizacion_id`, `opcion_id` (vacío = va igual en todas las opciones), `tipo` (`hotel` | `vuelo` | `actividad` | `servicio`), `hotel_id` / `actividad_id` / `servicio_id` / `aerolinea_id`, `proveedor_id` («Se reserva en»), `moneda`, `neto`, `tipo_cambio`, `neto_mxn`, `utilidad_pct`, `precio_cliente`, `fecha_inicio`, `fecha_fin`, `nota_cliente`, `detalle` (JSON con lo propio de cada tipo: plan, régimen, recogida y hora, cobertura…).
- Acuerdo de la reserva (se propone el último con ese proveedor): `pago_forma`, `pagar_antes`, `pago_en_destino`, `anticipo_proveedor`, `cancelacion_gratis_hasta`, `cancelacion_texto`, `reembolsable`.

**partida_habitaciones**: `partida_id`, `habitacion_id`, `cama` (lista fija: King, Queen, 2 Queen, 2 dobles, 2 dobles + sofá cama, Matrimonial, 2 individuales), `personas` (por defecto 4), `neto`, `reembolsable`.
**partida_renglones**: boletos, unidades o personas de actividades y servicios. `partida_id`, `concepto` («Adulto», «Van adaptada»), `cantidad`, `neto_unitario`.
**vuelo_tramos**: `partida_id`, `sentido` (`ida` | `regreso`), `numero` («VB 2124»), `origen` y `destino` (IATA), `terminal`, `sale`, `llega`, `duracion`, `escalas`.

**enlace_visitas**: `cotizacion_id`, `en`, `es_equipo` (las visitas del equipo no cuentan).
**solicitudes_cambio**: `viaje_id`, `texto`, `temas`, `fechas`, `atendida_en`.
**solicitudes** (formulario de solicitud, pendiente de diseño): `nombre`, `whatsapp`, `destino`, `fechas`, `personas`, `mensaje`, `viaje_id` al convertirse.

### 3.8 Validar, datos y pago, reservas (F3 y F4)

**validaciones** (F3): `partida_id`, `resultado` (`igual` | `cambio_precio` | `agotado` | `no_verificado`), `neto_nuevo`, `motivo` (tarifa, tipo de cambio, impuestos, otro), `quien_cubre` (`airoo` | `cliente`, según tolerancia), `alternativa_partida_id`, `nota` («No contestan»), `revisado_por`, `revisado_en`.

**viajeros** (F3): `viaje_id`, `nombres`, `apellidos`, `fecha_nacimiento`, `nacionalidad`, `es_menor`, `idmex`, `pasaporte`, `pasaporte_vence`, `es_quien_cotiza`, `viaja`, `token_enlace` (aleatorio largo), `datos_completos_en`. Las fotos de INE o pasaporte, si se suben, van a un bucket privado con ligas temporales, solo para el equipo, y se borran 90 días después de que termina el viaje.
**aceptaciones_privacidad** (F3): `viaje_id`, `viajero_id`, `version_aviso`, `aceptado_en`, `ip`. Se guarda en Datos y pago y en el enlace del pasajero.
**habitacion_huespedes** (F3): `partida_habitacion_id`, `viajero_id`, `titular`.

**cobros** (F3): pagos del cliente. `viaje_id`, `concepto` (anticipo, 2º pago, pago final, contado, tu parte), `pagador_viajero_id` (pagos divididos), `monto`, `vence`, `metodo` (`spei` | `tarjeta`), `estado` (`programado` | `aviso_cliente` | `por_confirmar` | `confirmado` | `cancelado`), `avisado_en`, `deposito_en`, `banco_emisor`, `clave_rastreo`, `referencia`, `cep_verificado`, `mismo_banco_verificado` (portal del banco), `comprobante` (archivo), `comision_pasarela`, `confirmado_por`, `confirmado_en`.

**reservas** (F4): una por partida aprobada. `partida_id`, `proveedor_id`, `estado` (`por_reservar` | `en_proceso` | `reservado` | `cancelado`), `id_proveedor` («RH-2026-88412»), `clave` (vuelo), `folio`, `verificado_por_telefono`, `verificado_en`, `costo_neto_real`, `moneda`, acuerdo final (`pagar_antes`, `pago_forma`, `cuenta_proveedor_id`, `pagado_al_reservar`), `cancelacion_gratis_hasta`, `cancelacion_texto`.
**reserva_claves** (F4): clave por habitación. `reserva_id`, `partida_habitacion_id`, `clave`.

**pagos_proveedor** (F4): lo que ya se pagó (no se paga desde el sistema). `reserva_id`, `monto`, `moneda`, `pagado_en`, `forma_pago_airoo_id`, `cuenta_proveedor_id`, `comprobante`, `para_revision` (primer pago a cuenta nueva), `registrado_por`.

**documentos** (F4): `viaje_id`, `reserva_id`, `viajero_id` (opcional: pase de abordar por persona), `tipo` (confirmación, bono, póliza, pase de abordar, factura, comprobante, datos del chofer), `archivo`, `para_cliente`, `estado` (`esperado` | `recibido` | `publicado` | `visto`), `esperado_cuando`, `publicado_en`, `visto_en`. Sin `reserva_id` = «Sin asignar».

### 3.9 Finanzas, cancelación y avisos (F4 y F5)

**facturas** (F4): `viaje_id`, `cobro_id`, `razon_social`, `rfc`, `estado` (`por_emitir` | `emitida`), `archivo`.

**comisiones** (F4): `viaje_id`, `asesora_id`, `venta`, `costo`, `utilidad`, `porcentaje_airoo` (35% al momento), `monto_airoo`, `monto_asesora`, `estado` (`por_liberar` | `para_pagar` | `pagada`), `pagada_en`. Pasa a «Para pagar» cuando el viaje termina.

**cancelaciones** (F5): `viaje_id`, `motivo`, `cliente_pidio_en`, `cliente_pidio_por`, `forma_devolucion` (`spei` | `credito`), `monto_devolver`, `clabe_cliente` (cifrada), `clave_rastreo`, `cancelado_por`.
**cancelacion_partidas** (F5): `cancelacion_id`, `partida_id`, `pago_cliente`, `retiene_proveedor`, `ganancia_no_devuelta`, `cargo_cancelacion` (lo único que ve el cliente), `devolver`, `tarea_proveedor`, `tarea_hecha`.
**creditos_airoo** (F5): `cliente_id`, `monto`, `vence` (12 meses), `viaje_origen_id`, `viaje_usado_id`.

**viaje_eventos** (F2): historial del viaje. `viaje_id`, `tipo`, `texto` («Nataly aceptó Seadust»), `quien` (usuario o cliente), `en`, `visible_cliente`.

**avisos** (F0 la tabla, F4 los tipos): `para` → usuarios, `viaje_id`, `tipo`, `prioridad`, `texto`, `liga`, `leido_en`, `hecho_en`, `pospuesto_hasta`, `resuelto_en`.
**preferencias_avisos** (F4): `usuario_id`, `tipo`, `panel`, `whatsapp`, `alcance` (`mios` | `todos`), `no_molestar_de`, `no_molestar_a`. Los avisos fijos no se apagan.

---

## 4. Relaciones principales

```
ciudades ─< hoteles, actividades, servicios, viajes
proveedores ─< contactos, cuentas
proveedores >─< hoteles        (hotel_proveedores, hotel_habitacion_nombres)
proveedores >─< actividades    (actividad_proveedores)
proveedores >─< servicios      (servicio_proveedores)
hoteles ─< habitaciones ─< fotos ; hoteles ─< cargos
aerolineas ─< tarifas, checkin

clientes ─< viajes ─< cotizaciones (versiones) ─< opciones
                                    cotizaciones ─< partidas >─ (hotel | actividad | servicio | aerolínea) + proveedor
                                    partidas ─< habitaciones, renglones, tramos de vuelo, validaciones
viajes ─< viajeros >─< partida_habitaciones (huéspedes)
viajes ─< cobros ; partidas ─ reservas ─< claves, pagos_proveedor, documentos
viajes ─ comisiones, cancelaciones ─< cancelacion_partidas ; clientes ─< creditos_airoo
usuarios ─< viajes (a cargo), avisos, preferencias, bitácora
```

**Permisos** (tabla «Qué puede hacer cada rol» de Configuración), en código en un solo lugar y reforzados en la base:

| Permiso | Dueño | Asesora | Contador |
|---|---|---|---|
| Cotizar, enviar y reservar | Sí | Sí | No |
| Ver costos y utilidad | Sí | Solo sus viajes | Sí |
| Confirmar pagos de clientes | Sí | Sí | Sí |
| Cancelar viajes y reembolsar | Sí | No | No |
| Ver Finanzas | Sí | No | Sí |
| Cambiar cuentas para recibir pagos | Sí | No | No |
| Configuración, equipo y ciudades | Sí | No | No |

La asesora ve todos los viajes, pero netos y utilidad solo de los suyos. Eso se resuelve en el servidor (vistas que ocultan esos campos), no solo con reglas por fila.

---

## 5. Fase 0 · Base, en tareas

1. **Proyecto**: Next.js + TypeScript + Tailwind + Drizzle, ESLint, Prettier, Vitest y Playwright. Variables de entorno de ejemplo.
2. **Diseño base**: colores, tipografía, radios y sombras de las capturas como variables; componentes base (botón, campo, interruptor, insignia, tarjeta, tabla, diálogo de confirmación, aviso flotante con «Deshacer»).
3. **Utilidades compartidas**: dinero en centavos con formato $42,248.48 y US$1,980; fechas «Mié 21 oct» en hora de Cancún; búsqueda sin acentos.
4. **Base de datos**: Supabase local, migraciones de usuarios, invitaciones, configuración, ciudades, avisos y bitácora; extensiones `unaccent` y `pg_trgm`; reglas por fila.
5. **Inicio de sesión**: entrar, salir y recuperar contraseña; proteger todas las rutas del panel.
6. **Roles y permisos**: matriz de la tabla de arriba en un solo módulo; pruebas por rol.
7. **Invitaciones**: el Dueño invita por correo (y copia la liga para mandarla por WhatsApp); la persona entra con el rol elegido; queda en la bitácora.
8. **Layout del panel**: barra lateral (Viajes, Avisos, Clientes, Finanzas · Catálogos · Agencia) con contadores, «Tu cuenta» abajo; cada rol ve solo lo que puede usar.
9. **Buscador y saludo**: barra de búsqueda arriba (sin resultados hasta la Fase 2), «Buenos días» con la fecha.
10. **Estados vacíos**: cada sección con su texto descriptivo en el tono del CLAUDE.md; Avisos con «Nada pendiente», «Sin novedades», «Todavía nada».
11. **Ciudades**: lista con búsqueda, alta solo para el Dueño con aviso de parecidas, archivar con confirmación.
12. **Datos de ejemplo**: Dueño, Asesora 1 y 2, Contador; ciudades de los prototipos.
13. **Pruebas y vista previa**: pruebas de permisos, formatos y ciudades parecidas; liga de Vercel para revisar.

## 6. Fase 1 · Catálogos, en tareas

**Base común**
1. Migraciones de proveedores, hoteles, actividades, servicios, aerolíneas, cuentas y formas de pago de Airoo.
2. Subida de fotos a Supabase Storage: tamaño, detección de foto chica o cuadrada, recorte 16:9 con encuadre ajustable, orden arrastrando.
3. Componentes compartidos de catálogo: lista con filtros (Activos, Por completar, Archivados), panel lateral de vista rápida, archivar/reactivar con confirmación, eliminar solo si nunca se usó, historial de cambios.

**Proveedores** (Catalogo-Proveedores)
4. Lista con filtros Todos, Plataformas, Directos; búsqueda por proveedor o contacto.
5. Alta y edición: plataforma (sitio + número de agencia) o directo, qué le compras, nota interna.
6. Contactos: varios, con para qué, WhatsApp, correo y horario; botón para abrir WhatsApp.
7. Cuentas donde recibe: CLABE o tarjeta, copiar completa; toda cuenta nueva o cambiada queda pendiente hasta «Confirmé el cambio por teléfono» al número registrado; aprobar o rechazar; queda en la bitácora.
8. «Últimos acuerdos» con su estado vacío («Todavía no hay reservas con este proveedor»).

**Hoteles** (Catalogo-Hoteles, Hotel-Ficha)
9. Lista con destino, régimen, habitaciones, dónde se reserva y «Por completar».
10. Alta manual con nombre y ciudad (con «Agregar ciudad a la lista» para el Dueño); la importación aparece apagada.
11. Ficha: datos generales, Tripadvisor (ID, calificación y opiniones capturados a mano), dirección y liga de Maps, teléfono público.
12. Portada 16:9 y galería; habitaciones con su grupo de fotos y nombres por plataforma.
13. Llegada, salida, edad de menores, reglas y cargos que se pagan en el hotel con su moneda.
14. Dónde se puede reservar (plataforma o directo, con ID opcional) y datos para el equipo.
15. Vista previa como cliente; archivar, reactivar y «Unir con otro hotel».

**Actividades** (Catalogo-Actividades, Actividad-Ficha)
16. Lista y alta con nombre, ciudad y tipo.
17. Ficha base: nombre, ciudad, tipo, duración, descripción, portada y galería.
18. Los 8 bloques opcionales con encendido por actividad; el tipo sugiere bloques sin apagar los que tienen datos.
19. Proveedores ligados (se consultan, no se copian) o «Lo paga el cliente en el lugar»; resumen «En el armador se va a pedir».

**Servicios y aerolíneas** (Catalogo-Servicios, Catalogo-Aerolineas)
20. Servicios por tipo con su modelo de cobro, variantes (unidades, planes, tipos), lo que recibe el cliente y proveedores.
21. Carga única de aerolíneas por código IATA; ficha con tarifas y equipaje, ventanas de check-in con su fuente y cómo se compra.

**Configuración** (Configuracion)
22. Precios, cobros a clientes, pagos a proveedores, datos y horario, equipo y permisos (con la comisión del 35%), bitácora con exportar a CSV. Cambiar la cuenta de cobro pide código por correo o la contraseña del Dueño, y se activa 24 h después.

23. **Pruebas y vista previa**: archivar contra eliminar, verificación de cuentas, avisos de foto, búsqueda; liga de Vercel.

---

## 7. Decisiones que tomé por default (cámbialas si no van)

- «Administrador» en las reglas = **Dueño**.
- La asesora ve todos los viajes, pero costos y utilidad solo de los suyos (así lo dice la tabla de roles).
- Precios en centavos enteros, con la moneda en cada partida.
- Clientes y formulario de solicitud tienen tabla reservada aunque su diseño esté pendiente; las pantallas se hacen cuando estén diseñadas.
- Todo se construye en local. Las cuentas de Supabase y Vercel se crean cuando Luis quiera ver la vista previa.
