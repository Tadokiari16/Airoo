CREATE TYPE "public"."cobro_actividad" AS ENUM('persona', 'edad', 'grupo', 'unidad');--> statement-breakpoint
CREATE TYPE "public"."confirmacion_actividad" AS ENUM('bono', 'lista_nombres', 'pago_taquilla');--> statement-breakpoint
CREATE TYPE "public"."estado_cuenta_cobro" AS ENUM('verificada', 'por_activar', 'reemplazada');--> statement-breakpoint
CREATE TYPE "public"."estado_cuenta_proveedor" AS ENUM('pendiente', 'verificada', 'rechazada', 'reemplazada');--> statement-breakpoint
CREATE TYPE "public"."fuente_checkin" AS ENUM('verificado', 'terceros', 'sin_fuente');--> statement-breakpoint
CREATE TYPE "public"."horario_actividad" AS ENUM('abierto', 'salidas');--> statement-breakpoint
CREATE TYPE "public"."llegada_actividad" AS ENUM('recogida', 'punto_encuentro', 'por_su_cuenta');--> statement-breakpoint
CREATE TYPE "public"."modelo_cobro" AS ENUM('vehiculo', 'persona', 'persona_dia', 'unidad', 'dia', 'fijo');--> statement-breakpoint
CREATE TYPE "public"."moneda" AS ENUM('MXN', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."para_que_contacto" AS ENUM('reservas', 'ventas', 'pagos', 'emergencias');--> statement-breakpoint
CREATE TYPE "public"."ruta_vuelo" AS ENUM('nacional', 'internacional');--> statement-breakpoint
CREATE TYPE "public"."se_cobra_cargo" AS ENUM('habitacion_noche', 'persona_noche', 'estancia');--> statement-breakpoint
CREATE TYPE "public"."tipo_actividad" AS ENUM('tour', 'excursion', 'parque', 'day_pass', 'experiencia', 'espectaculo', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_cuenta" AS ENUM('clabe', 'tarjeta');--> statement-breakpoint
CREATE TYPE "public"."tipo_forma_pago" AS ENUM('tarjeta', 'cuenta');--> statement-breakpoint
CREATE TYPE "public"."tipo_proveedor" AS ENUM('plataforma', 'directo');--> statement-breakpoint
CREATE TYPE "public"."tipo_servicio" AS ENUM('traslado', 'seguro', 'conectividad', 'equipo', 'reservacion');--> statement-breakpoint
CREATE TABLE "actividad_boletos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actividad_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"edad_desde" integer,
	"edad_hasta" integer,
	"gratis" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividad_boletos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "actividad_planes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actividad_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"incluye" text,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividad_planes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "actividad_proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actividad_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"id_externo" text,
	"contacto_id" uuid
);
--> statement-breakpoint
ALTER TABLE "actividad_proveedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "actividad_salidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actividad_id" uuid NOT NULL,
	"hora" time NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividad_salidas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "actividades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_busqueda" text NOT NULL,
	"ciudad_id" uuid NOT NULL,
	"tipo" "tipo_actividad" NOT NULL,
	"duracion" text,
	"descripcion" text,
	"nota_interna" text,
	"se_paga_en_lugar" boolean DEFAULT false NOT NULL,
	"bloques" text[] DEFAULT '{}'::text[] NOT NULL,
	"cobro" "cobro_actividad",
	"max_personas_grupo" integer,
	"horario_tipo" "horario_actividad",
	"horario_texto" text,
	"llegada" "llegada_actividad",
	"llegada_texto" text,
	"incluye" text,
	"no_incluye" text,
	"que_llevar" text,
	"requisitos" text,
	"confirmacion" "confirmacion_actividad",
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"motivo_archivo" text,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "aerolinea_checkin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aerolinea_id" uuid NOT NULL,
	"ruta" "ruta_vuelo" NOT NULL,
	"abre" text,
	"cierra" text,
	"fuente" "fuente_checkin" DEFAULT 'sin_fuente' NOT NULL,
	"fuente_texto" text,
	"verificado_por" uuid,
	"verificado_en" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "aerolinea_checkin" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "aerolinea_tarifas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aerolinea_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"mano" text,
	"documentada" text,
	"cambios" text,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "aerolineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iata" text NOT NULL,
	"nombre" text NOT NULL,
	"sitio" text,
	"como_se_compra" text,
	"nota_interna" text,
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"motivo_archivo" text,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aerolineas_iata_unique" UNIQUE("iata")
);
--> statement-breakpoint
ALTER TABLE "aerolineas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "aerolineas_iata" (
	"iata" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"pais" text
);
--> statement-breakpoint
ALTER TABLE "aerolineas_iata" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_cobro_airoo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"banco" text NOT NULL,
	"clabe_cifrada" text NOT NULL,
	"ultimos4" text NOT NULL,
	"principal" boolean DEFAULT false NOT NULL,
	"estado" "estado_cuenta_cobro" DEFAULT 'por_activar' NOT NULL,
	"activa_desde" timestamp with time zone,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cuentas_cobro_airoo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "formas_pago_airoo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_forma_pago" NOT NULL,
	"nombre" text NOT NULL,
	"banco" text,
	"ultimos4" text,
	"uso" text,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "formas_pago_airoo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid,
	"habitacion_id" uuid,
	"actividad_id" uuid,
	"archivo" text NOT NULL,
	"ancho" integer NOT NULL,
	"alto" integer NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"es_portada" boolean DEFAULT false NOT NULL,
	"encuadre" jsonb,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fotos_de_un_solo_dueno" CHECK (("fotos"."hotel_id" is null) <> ("fotos"."actividad_id" is null)),
	CONSTRAINT "fotos_habitacion_con_hotel" CHECK ("fotos"."habitacion_id" is null or "fotos"."hotel_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "fotos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hotel_cargos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid NOT NULL,
	"concepto" text NOT NULL,
	"monto_centavos" integer NOT NULL,
	"moneda" "moneda" NOT NULL,
	"se_cobra" "se_cobra_cargo" NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotel_cargos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hotel_habitacion_nombres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habitacion_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotel_habitacion_nombres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hotel_habitaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid NOT NULL,
	"nombre_cliente" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotel_habitaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hotel_proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"id_externo" text
);
--> statement-breakpoint
ALTER TABLE "hotel_proveedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hoteles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_busqueda" text NOT NULL,
	"ciudad_id" uuid NOT NULL,
	"descripcion" text,
	"regimenes" text[] DEFAULT '{}'::text[] NOT NULL,
	"direccion" text,
	"liga_maps" text,
	"telefono_publico" text,
	"tripadvisor_id" text,
	"tripadvisor_calificacion" integer,
	"tripadvisor_opiniones" integer,
	"tripadvisor_actualizado_en" timestamp with time zone,
	"llegada_desde" time,
	"salida_hasta" time,
	"edad_menores_de" integer,
	"edad_menores_a" integer,
	"llegada_anticipada" text,
	"reglas" text,
	"telefono_reservaciones" text,
	"correo_reservaciones" text,
	"nota_interna" text,
	"solo_adultos" boolean DEFAULT false NOT NULL,
	"unido_a" uuid,
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"motivo_archivo" text,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hoteles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proveedor_contactos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"para_que" "para_que_contacto" NOT NULL,
	"whatsapp" text,
	"correo" text,
	"horario" text,
	"principal" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proveedor_contactos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proveedor_cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"tipo" "tipo_cuenta" NOT NULL,
	"banco" text NOT NULL,
	"a_nombre_de" text NOT NULL,
	"numero_cifrado" text NOT NULL,
	"ultimos4" text NOT NULL,
	"estado" "estado_cuenta_proveedor" DEFAULT 'pendiente' NOT NULL,
	"telefono_llamada" text,
	"confirmo_por_telefono" boolean DEFAULT false NOT NULL,
	"estado_cuenta_coincide" boolean DEFAULT false NOT NULL,
	"revisada_por" uuid,
	"revisada_en" timestamp with time zone,
	"reemplaza_a" uuid,
	"primer_pago_revisado" boolean DEFAULT false NOT NULL,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proveedor_cuentas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_busqueda" text NOT NULL,
	"tipo" "tipo_proveedor" NOT NULL,
	"categorias" text[] DEFAULT '{}'::text[] NOT NULL,
	"sitio" text,
	"numero_agencia" text,
	"razon_social" text,
	"nota_interna" text,
	"desde" date DEFAULT now() NOT NULL,
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"motivo_archivo" text,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proveedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "servicio_proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"id_externo" text
);
--> statement-breakpoint
ALTER TABLE "servicio_proveedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "servicio_variantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"pasajeros" integer,
	"maletas" integer,
	"detalle" text,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "servicio_variantes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_busqueda" text NOT NULL,
	"tipo" "tipo_servicio" NOT NULL,
	"destino" text,
	"ciudad_id" uuid,
	"modelo_cobro" "modelo_cobro" NOT NULL,
	"descripcion" text,
	"cliente_recibe" text,
	"en_viaje_confirmado" text,
	"nota_interna" text,
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"motivo_archivo" text,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "servicios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "actividad_boletos" ADD CONSTRAINT "actividad_boletos_actividad_id_actividades_id_fk" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_planes" ADD CONSTRAINT "actividad_planes_actividad_id_actividades_id_fk" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_proveedores" ADD CONSTRAINT "actividad_proveedores_actividad_id_actividades_id_fk" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_proveedores" ADD CONSTRAINT "actividad_proveedores_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_proveedores" ADD CONSTRAINT "actividad_proveedores_contacto_id_proveedor_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."proveedor_contactos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_salidas" ADD CONSTRAINT "actividad_salidas_actividad_id_actividades_id_fk" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_ciudad_id_ciudades_id_fk" FOREIGN KEY ("ciudad_id") REFERENCES "public"."ciudades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aerolinea_checkin" ADD CONSTRAINT "aerolinea_checkin_aerolinea_id_aerolineas_id_fk" FOREIGN KEY ("aerolinea_id") REFERENCES "public"."aerolineas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aerolinea_checkin" ADD CONSTRAINT "aerolinea_checkin_verificado_por_usuarios_id_fk" FOREIGN KEY ("verificado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ADD CONSTRAINT "aerolinea_tarifas_aerolinea_id_aerolineas_id_fk" FOREIGN KEY ("aerolinea_id") REFERENCES "public"."aerolineas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aerolineas" ADD CONSTRAINT "aerolineas_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aerolineas" ADD CONSTRAINT "aerolineas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_cobro_airoo" ADD CONSTRAINT "cuentas_cobro_airoo_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formas_pago_airoo" ADD CONSTRAINT "formas_pago_airoo_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_hotel_id_hoteles_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hoteles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_habitacion_id_hotel_habitaciones_id_fk" FOREIGN KEY ("habitacion_id") REFERENCES "public"."hotel_habitaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_actividad_id_actividades_id_fk" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_cargos" ADD CONSTRAINT "hotel_cargos_hotel_id_hoteles_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hoteles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_habitacion_nombres" ADD CONSTRAINT "hotel_habitacion_nombres_habitacion_id_hotel_habitaciones_id_fk" FOREIGN KEY ("habitacion_id") REFERENCES "public"."hotel_habitaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_habitacion_nombres" ADD CONSTRAINT "hotel_habitacion_nombres_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_habitaciones" ADD CONSTRAINT "hotel_habitaciones_hotel_id_hoteles_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hoteles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_proveedores" ADD CONSTRAINT "hotel_proveedores_hotel_id_hoteles_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hoteles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_proveedores" ADD CONSTRAINT "hotel_proveedores_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hoteles" ADD CONSTRAINT "hoteles_ciudad_id_ciudades_id_fk" FOREIGN KEY ("ciudad_id") REFERENCES "public"."ciudades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hoteles" ADD CONSTRAINT "hoteles_unido_a_hoteles_id_fk" FOREIGN KEY ("unido_a") REFERENCES "public"."hoteles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hoteles" ADD CONSTRAINT "hoteles_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hoteles" ADD CONSTRAINT "hoteles_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor_contactos" ADD CONSTRAINT "proveedor_contactos_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor_cuentas" ADD CONSTRAINT "proveedor_cuentas_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor_cuentas" ADD CONSTRAINT "proveedor_cuentas_revisada_por_usuarios_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor_cuentas" ADD CONSTRAINT "proveedor_cuentas_reemplaza_a_proveedor_cuentas_id_fk" FOREIGN KEY ("reemplaza_a") REFERENCES "public"."proveedor_cuentas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor_cuentas" ADD CONSTRAINT "proveedor_cuentas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicio_proveedores" ADD CONSTRAINT "servicio_proveedores_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicio_proveedores" ADD CONSTRAINT "servicio_proveedores_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicio_variantes" ADD CONSTRAINT "servicio_variantes_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_ciudad_id_ciudades_id_fk" FOREIGN KEY ("ciudad_id") REFERENCES "public"."ciudades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actividad_boletos_actividad_id_index" ON "actividad_boletos" USING btree ("actividad_id");--> statement-breakpoint
CREATE INDEX "actividad_planes_actividad_id_index" ON "actividad_planes" USING btree ("actividad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "actividad_proveedores_actividad_id_proveedor_id_index" ON "actividad_proveedores" USING btree ("actividad_id","proveedor_id");--> statement-breakpoint
CREATE INDEX "actividad_proveedores_proveedor_id_index" ON "actividad_proveedores" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "actividad_salidas_actividad_id_index" ON "actividad_salidas" USING btree ("actividad_id");--> statement-breakpoint
CREATE INDEX "actividades_nombre_busqueda_index" ON "actividades" USING btree ("nombre_busqueda");--> statement-breakpoint
CREATE INDEX "actividades_ciudad_id_index" ON "actividades" USING btree ("ciudad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aerolinea_checkin_aerolinea_id_ruta_index" ON "aerolinea_checkin" USING btree ("aerolinea_id","ruta");--> statement-breakpoint
CREATE INDEX "aerolinea_tarifas_aerolinea_id_index" ON "aerolinea_tarifas" USING btree ("aerolinea_id");--> statement-breakpoint
CREATE INDEX "fotos_hotel_id_index" ON "fotos" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "fotos_actividad_id_index" ON "fotos" USING btree ("actividad_id");--> statement-breakpoint
CREATE INDEX "hotel_cargos_hotel_id_index" ON "hotel_cargos" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "hotel_habitacion_nombres_habitacion_id_index" ON "hotel_habitacion_nombres" USING btree ("habitacion_id");--> statement-breakpoint
CREATE INDEX "hotel_habitaciones_hotel_id_index" ON "hotel_habitaciones" USING btree ("hotel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hotel_proveedores_hotel_id_proveedor_id_index" ON "hotel_proveedores" USING btree ("hotel_id","proveedor_id");--> statement-breakpoint
CREATE INDEX "hotel_proveedores_proveedor_id_index" ON "hotel_proveedores" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "hoteles_nombre_busqueda_index" ON "hoteles" USING btree ("nombre_busqueda");--> statement-breakpoint
CREATE INDEX "hoteles_ciudad_id_index" ON "hoteles" USING btree ("ciudad_id");--> statement-breakpoint
CREATE INDEX "proveedor_contactos_proveedor_id_index" ON "proveedor_contactos" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "proveedor_cuentas_proveedor_id_index" ON "proveedor_cuentas" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "proveedores_nombre_busqueda_index" ON "proveedores" USING btree ("nombre_busqueda");--> statement-breakpoint
CREATE UNIQUE INDEX "servicio_proveedores_servicio_id_proveedor_id_index" ON "servicio_proveedores" USING btree ("servicio_id","proveedor_id");--> statement-breakpoint
CREATE INDEX "servicio_proveedores_proveedor_id_index" ON "servicio_proveedores" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "servicio_variantes_servicio_id_index" ON "servicio_variantes" USING btree ("servicio_id");--> statement-breakpoint
CREATE INDEX "servicios_nombre_busqueda_index" ON "servicios" USING btree ("nombre_busqueda");