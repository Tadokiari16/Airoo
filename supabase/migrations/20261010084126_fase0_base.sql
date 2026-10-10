CREATE TYPE "public"."estado_invitacion" AS ENUM('pendiente', 'aceptada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('dueno', 'asesora', 'contador');--> statement-breakpoint
CREATE TABLE "avisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"para" uuid NOT NULL,
	"viaje_id" uuid,
	"tipo" text NOT NULL,
	"prioridad" boolean DEFAULT false NOT NULL,
	"texto" text NOT NULL,
	"liga" text,
	"leido_en" timestamp with time zone,
	"hecho_en" timestamp with time zone,
	"pospuesto_hasta" timestamp with time zone,
	"resuelto_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avisos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bitacora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuando" timestamp with time zone DEFAULT now() NOT NULL,
	"quien" uuid,
	"texto" text NOT NULL,
	"entidad" text,
	"entidad_id" text,
	"antes" jsonb,
	"despues" jsonb
);
--> statement-breakpoint
ALTER TABLE "bitacora" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ciudades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"region" text NOT NULL,
	"pais" text DEFAULT 'México' NOT NULL,
	"nombre_busqueda" text NOT NULL,
	"archivado_en" timestamp with time zone,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ciudades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "configuracion" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuracion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invitaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"correo" text NOT NULL,
	"whatsapp" text,
	"rol" "rol" NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"invitado_por" uuid,
	"estado" "estado_invitacion" DEFAULT 'pendiente' NOT NULL,
	"vence_en" timestamp with time zone NOT NULL,
	"aceptada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"iniciales" text NOT NULL,
	"correo" text NOT NULL,
	"whatsapp" text,
	"rol" "rol" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_acceso" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_para_usuarios_id_fk" FOREIGN KEY ("para") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_quien_usuarios_id_fk" FOREIGN KEY ("quien") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ciudades" ADD CONSTRAINT "ciudades_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_cuenta_id_users_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_invitado_por_usuarios_id_fk" FOREIGN KEY ("invitado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avisos_para_leido_en_index" ON "avisos" USING btree ("para","leido_en");--> statement-breakpoint
CREATE INDEX "bitacora_cuando_index" ON "bitacora" USING btree ("cuando");--> statement-breakpoint
CREATE UNIQUE INDEX "ciudades_unica" ON "ciudades" USING btree ("nombre_busqueda",lower("region"),lower("pais"));--> statement-breakpoint
CREATE INDEX "invitaciones_cuenta_id_index" ON "invitaciones" USING btree ("cuenta_id");