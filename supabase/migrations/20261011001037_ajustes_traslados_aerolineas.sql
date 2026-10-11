CREATE TYPE "public"."cambios_tarifa" AS ENUM('sin_cambios', 'con_cargo', 'sin_cargo');--> statement-breakpoint
ALTER TYPE "public"."tipo_partida" ADD VALUE 'traslado';--> statement-breakpoint
CREATE TABLE "traslado_unidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_busqueda" text NOT NULL,
	"pasajeros" integer NOT NULL,
	"maletas" integer NOT NULL,
	"adaptada" boolean DEFAULT false NOT NULL,
	"descripcion" text,
	"foto" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"motivo_archivo" text,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traslado_unidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ADD COLUMN "mano_piezas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ADD COLUMN "mano_kg" integer;--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ADD COLUMN "documentado_piezas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ADD COLUMN "documentado_kg" integer;--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ADD COLUMN "cambios_regla" "cambios_tarifa";--> statement-breakpoint
ALTER TABLE "aerolinea_tarifas" ADD COLUMN "articulo_personal" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "partida_trayectos" ADD COLUMN "vuelo_fecha" date;--> statement-breakpoint
ALTER TABLE "partida_trayectos" ADD COLUMN "vuelo_hora" time;--> statement-breakpoint
ALTER TABLE "partidas" ADD COLUMN "traslado_unidad_id" uuid;--> statement-breakpoint
ALTER TABLE "traslado_unidades" ADD CONSTRAINT "traslado_unidades_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traslado_unidades" ADD CONSTRAINT "traslado_unidades_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "traslado_unidades_nombre_busqueda_index" ON "traslado_unidades" USING btree ("nombre_busqueda");--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_traslado_unidad_id_traslado_unidades_id_fk" FOREIGN KEY ("traslado_unidad_id") REFERENCES "public"."traslado_unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Las tarifas que ya estaban en texto pasan a las opciones cerradas: «10 kg» es una pieza de 10 kg.
UPDATE "aerolinea_tarifas" SET
	"mano_piezas" = CASE WHEN "mano" ~* '\d+\s*kg' THEN 1 ELSE 0 END,
	"mano_kg" = (substring("mano" from '(\d+)\s*[kK][gG]'))::integer,
	"documentado_piezas" = CASE WHEN "documentada" ~* '\d+\s*kg' THEN 1 ELSE 0 END,
	"documentado_kg" = (substring("documentada" from '(\d+)\s*[kK][gG]'))::integer,
	"cambios_regla" = CASE lower(trim("cambios"))
		WHEN 'sin cambios' THEN 'sin_cambios'::"cambios_tarifa"
		WHEN 'con cargo' THEN 'con_cargo'::"cambios_tarifa"
		WHEN 'sin cargo' THEN 'sin_cargo'::"cambios_tarifa"
		ELSE NULL END;
--> statement-breakpoint
-- Las unidades de partida. Se editan en Traslados; sin precio ni proveedor.
INSERT INTO "traslado_unidades" ("nombre", "nombre_busqueda", "pasajeros", "maletas", "adaptada", "descripcion", "orden") VALUES
	('Sedán', 'sedan', 3, 3, false, 'Auto de cuatro puertas con aire acondicionado, para parejas o familias pequeñas con equipaje ligero.', 0),
	('SUV', 'suv', 5, 5, false, 'Camioneta amplia con aire acondicionado y espacio para una maleta grande por persona.', 1),
	('Van', 'van', 10, 10, false, 'Van con aire acondicionado para familias o grupos medianos, con espacio para el equipaje de todos.', 2),
	('Sprinter', 'sprinter', 18, 18, false, 'Van de techo alto para grupos grandes, con espacio atrás para el equipaje de todos.', 3),
	('Van adaptada', 'van adaptada', 6, 6, true, 'Van con rampa y anclajes para silla de ruedas; la silla viaja con su pasajero.', 4);
