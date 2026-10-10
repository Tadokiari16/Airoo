CREATE TABLE "aeropuertos" (
	"iata" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"ciudad" text NOT NULL,
	"pais" text NOT NULL,
	"pais_codigo" text NOT NULL,
	"zona_horaria" text NOT NULL,
	"busqueda" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aeropuertos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partidas" ADD COLUMN "neto_total_centavos" integer;--> statement-breakpoint
ALTER TABLE "vuelo_tramos" ADD COLUMN "llega_dias" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Un solo costo neto total por servicio: la suma de lo que ya estaba capturado
-- por habitación o por renglón. Si faltaba alguno, queda sin costo.
UPDATE "partidas" p SET "neto_total_centavos" = h.total
  FROM (SELECT "partida_id", sum("neto_centavos")::int AS total, bool_and("neto_centavos" IS NOT NULL) AS completo
        FROM "partida_habitaciones" GROUP BY "partida_id") h
  WHERE h."partida_id" = p."id" AND h.completo AND p."tipo" = 'hotel';--> statement-breakpoint
UPDATE "partidas" p SET "neto_total_centavos" = r.total
  FROM (SELECT "partida_id", sum("neto_unitario_centavos" * "cantidad")::int AS total, bool_and("neto_unitario_centavos" IS NOT NULL) AS completo
        FROM "partida_renglones" GROUP BY "partida_id") r
  WHERE r."partida_id" = p."id" AND r.completo AND p."tipo" <> 'hotel';--> statement-breakpoint
UPDATE "vuelo_tramos" SET "llega_dias" = CASE WHEN "llega_dia_siguiente" THEN 1 ELSE 0 END;--> statement-breakpoint
-- Origen y destino pasan a ser la clave IATA: «Guadalajara (GDL)» → «GDL».
UPDATE "vuelo_tramos" SET
  "origen" = upper(coalesce((regexp_match("origen", '\(([A-Za-z]{3})\)'))[1], (regexp_match(trim("origen"), '^([A-Za-z]{3})$'))[1])),
  "destino" = upper(coalesce((regexp_match("destino", '\(([A-Za-z]{3})\)'))[1], (regexp_match(trim("destino"), '^([A-Za-z]{3})$'))[1]));
