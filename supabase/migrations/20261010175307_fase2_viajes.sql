CREATE TYPE "public"."estado_cotizacion" AS ENUM('borrador', 'enviada', 'aceptada', 'reemplazada');--> statement-breakpoint
CREATE TYPE "public"."etapa_viaje" AS ENUM('cotizacion', 'aprobada', 'datos_y_pago', 'en_reservacion', 'reservada', 'en_viaje', 'finalizada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."fuente_tipo_cambio" AS ENUM('banxico', 'manual');--> statement-breakpoint
CREATE TYPE "public"."pago_proveedor" AS ENUM('al_reservar', 'anticipo', 'en_el_lugar');--> statement-breakpoint
CREATE TYPE "public"."sentido_tramo" AS ENUM('ida', 'regreso');--> statement-breakpoint
CREATE TYPE "public"."tipo_partida" AS ENUM('hotel', 'vuelo', 'actividad', 'servicio');--> statement-breakpoint
CREATE SEQUENCE "public"."folio_viaje" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_busqueda" text NOT NULL,
	"whatsapp" text,
	"correo" text,
	"nota_interna" text,
	"ejemplo" boolean DEFAULT false NOT NULL,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cotizacion_opciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cotizacion_id" uuid NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"recomendada" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cotizacion_opciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cotizaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viaje_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"estado" "estado_cotizacion" DEFAULT 'borrador' NOT NULL,
	"valida_hasta" date,
	"utilidad_base_pb" integer NOT NULL,
	"con_iva" boolean DEFAULT false NOT NULL,
	"iva_pb" integer DEFAULT 1600 NOT NULL,
	"cargo_servicio_centavos" integer NOT NULL,
	"colchon_pb" integer NOT NULL,
	"fix_usd" integer,
	"fix_eur" integer,
	"fix_fecha" date,
	"notas" jsonb,
	"enviada_en" timestamp with time zone,
	"enviada_por" uuid,
	"aceptada_en" timestamp with time zone,
	"opcion_elegida_id" uuid,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cotizaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partida_habitaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"habitacion_id" uuid NOT NULL,
	"cama" text,
	"adultos" integer DEFAULT 0 NOT NULL,
	"menores" integer DEFAULT 0 NOT NULL,
	"neto_centavos" integer,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partida_habitaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partida_renglones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"concepto" text NOT NULL,
	"boleto_id" uuid,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"neto_unitario_centavos" integer,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partida_renglones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partida_trayectos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"desde" text NOT NULL,
	"hasta" text NOT NULL,
	"fecha" date,
	"hora" time,
	"vuelo_tramo_id" uuid
);
--> statement-breakpoint
ALTER TABLE "partida_trayectos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cotizacion_id" uuid NOT NULL,
	"opcion_id" uuid,
	"tipo" "tipo_partida" NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"hotel_id" uuid,
	"actividad_id" uuid,
	"servicio_id" uuid,
	"aerolinea_id" uuid,
	"plan_id" uuid,
	"variante_id" uuid,
	"tarifa_id" uuid,
	"proveedor_id" uuid,
	"regimen" text,
	"fecha_inicio" date,
	"fecha_fin" date,
	"moneda" "moneda" DEFAULT 'MXN' NOT NULL,
	"tipo_cambio" integer,
	"utilidad_pb" integer NOT NULL,
	"utilidad_manual" boolean DEFAULT false NOT NULL,
	"detalle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pago_proveedor" "pago_proveedor" DEFAULT 'al_reservar' NOT NULL,
	"anticipo_proveedor_pb" integer DEFAULT 0 NOT NULL,
	"pagar_antes" date,
	"cancelacion_gratis_hasta" date,
	"cancelacion_texto" text,
	"reembolsable" boolean DEFAULT false NOT NULL,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partidas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tipos_cambio" (
	"fecha" date NOT NULL,
	"moneda" "moneda" NOT NULL,
	"diezmilesimos" integer NOT NULL,
	"fuente" "fuente_tipo_cambio" NOT NULL,
	"capturado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tipos_cambio" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "viaje_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viaje_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"texto" text NOT NULL,
	"etiqueta" text,
	"quien" uuid,
	"de_cliente" boolean DEFAULT false NOT NULL,
	"visible_cliente" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "viaje_eventos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "viajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folio" integer NOT NULL,
	"cliente_id" uuid NOT NULL,
	"a_cargo" uuid,
	"ciudad_destino_id" uuid NOT NULL,
	"ciudad_salida_id" uuid,
	"inicio" date NOT NULL,
	"fin" date NOT NULL,
	"adultos" integer NOT NULL,
	"menores" integer DEFAULT 0 NOT NULL,
	"edades_menores" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"etapa" "etapa_viaje" DEFAULT 'cotizacion' NOT NULL,
	"token_cliente" text NOT NULL,
	"ejemplo" boolean DEFAULT false NOT NULL,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "viajes_folio_unique" UNIQUE("folio"),
	CONSTRAINT "viajes_tokenCliente_unique" UNIQUE("token_cliente"),
	CONSTRAINT "viajes_fechas" CHECK ("viajes"."fin" >= "viajes"."inicio")
);
--> statement-breakpoint
ALTER TABLE "viajes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vuelo_tramos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"sentido" "sentido_tramo" NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"numero" text,
	"fecha" date,
	"origen" text,
	"destino" text,
	"terminal_salida" text,
	"terminal_llegada" text,
	"sale" time,
	"llega" time,
	"llega_dia_siguiente" boolean DEFAULT false NOT NULL,
	"duracion" text,
	"escalas" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vuelo_tramos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizacion_opciones" ADD CONSTRAINT "cotizacion_opciones_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_viaje_id_viajes_id_fk" FOREIGN KEY ("viaje_id") REFERENCES "public"."viajes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_enviada_por_usuarios_id_fk" FOREIGN KEY ("enviada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida_habitaciones" ADD CONSTRAINT "partida_habitaciones_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida_habitaciones" ADD CONSTRAINT "partida_habitaciones_habitacion_id_hotel_habitaciones_id_fk" FOREIGN KEY ("habitacion_id") REFERENCES "public"."hotel_habitaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida_renglones" ADD CONSTRAINT "partida_renglones_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida_renglones" ADD CONSTRAINT "partida_renglones_boleto_id_actividad_boletos_id_fk" FOREIGN KEY ("boleto_id") REFERENCES "public"."actividad_boletos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida_trayectos" ADD CONSTRAINT "partida_trayectos_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida_trayectos" ADD CONSTRAINT "partida_trayectos_vuelo_tramo_id_vuelo_tramos_id_fk" FOREIGN KEY ("vuelo_tramo_id") REFERENCES "public"."vuelo_tramos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_opcion_id_cotizacion_opciones_id_fk" FOREIGN KEY ("opcion_id") REFERENCES "public"."cotizacion_opciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_hotel_id_hoteles_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hoteles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_actividad_id_actividades_id_fk" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_aerolinea_id_aerolineas_id_fk" FOREIGN KEY ("aerolinea_id") REFERENCES "public"."aerolineas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_plan_id_actividad_planes_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."actividad_planes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_variante_id_servicio_variantes_id_fk" FOREIGN KEY ("variante_id") REFERENCES "public"."servicio_variantes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_tarifa_id_aerolinea_tarifas_id_fk" FOREIGN KEY ("tarifa_id") REFERENCES "public"."aerolinea_tarifas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_cambio" ADD CONSTRAINT "tipos_cambio_capturado_por_usuarios_id_fk" FOREIGN KEY ("capturado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viaje_eventos" ADD CONSTRAINT "viaje_eventos_viaje_id_viajes_id_fk" FOREIGN KEY ("viaje_id") REFERENCES "public"."viajes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viaje_eventos" ADD CONSTRAINT "viaje_eventos_quien_usuarios_id_fk" FOREIGN KEY ("quien") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_a_cargo_usuarios_id_fk" FOREIGN KEY ("a_cargo") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_ciudad_destino_id_ciudades_id_fk" FOREIGN KEY ("ciudad_destino_id") REFERENCES "public"."ciudades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_ciudad_salida_id_ciudades_id_fk" FOREIGN KEY ("ciudad_salida_id") REFERENCES "public"."ciudades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vuelo_tramos" ADD CONSTRAINT "vuelo_tramos_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clientes_nombre_busqueda_index" ON "clientes" USING btree ("nombre_busqueda");--> statement-breakpoint
CREATE INDEX "cotizacion_opciones_cotizacion_id_index" ON "cotizacion_opciones" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cotizaciones_viaje_id_version_index" ON "cotizaciones" USING btree ("viaje_id","version");--> statement-breakpoint
CREATE INDEX "partida_habitaciones_partida_id_index" ON "partida_habitaciones" USING btree ("partida_id");--> statement-breakpoint
CREATE INDEX "partida_renglones_partida_id_index" ON "partida_renglones" USING btree ("partida_id");--> statement-breakpoint
CREATE INDEX "partida_trayectos_partida_id_index" ON "partida_trayectos" USING btree ("partida_id");--> statement-breakpoint
CREATE INDEX "partidas_cotizacion_id_index" ON "partidas" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE INDEX "partidas_hotel_id_index" ON "partidas" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "partidas_actividad_id_index" ON "partidas" USING btree ("actividad_id");--> statement-breakpoint
CREATE INDEX "partidas_servicio_id_index" ON "partidas" USING btree ("servicio_id");--> statement-breakpoint
CREATE INDEX "partidas_aerolinea_id_index" ON "partidas" USING btree ("aerolinea_id");--> statement-breakpoint
CREATE INDEX "partidas_proveedor_id_index" ON "partidas" USING btree ("proveedor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_cambio_fecha_moneda_index" ON "tipos_cambio" USING btree ("fecha","moneda");--> statement-breakpoint
CREATE INDEX "viaje_eventos_viaje_id_creado_en_index" ON "viaje_eventos" USING btree ("viaje_id","creado_en");--> statement-breakpoint
CREATE INDEX "viajes_cliente_id_index" ON "viajes" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "viajes_inicio_index" ON "viajes" USING btree ("inicio");--> statement-breakpoint
CREATE INDEX "vuelo_tramos_partida_id_index" ON "vuelo_tramos" USING btree ("partida_id");