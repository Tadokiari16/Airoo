-- Una clave que no está en la lista de aeropuertos se deja vacía para capturarla de nuevo.
UPDATE "vuelo_tramos" SET "origen" = NULL WHERE "origen" IS NOT NULL AND "origen" NOT IN (SELECT "iata" FROM "aeropuertos");--> statement-breakpoint
UPDATE "vuelo_tramos" SET "destino" = NULL WHERE "destino" IS NOT NULL AND "destino" NOT IN (SELECT "iata" FROM "aeropuertos");--> statement-breakpoint
ALTER TABLE "vuelo_tramos" ADD CONSTRAINT "vuelo_tramos_origen_aeropuertos_iata_fk" FOREIGN KEY ("origen") REFERENCES "public"."aeropuertos"("iata") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vuelo_tramos" ADD CONSTRAINT "vuelo_tramos_destino_aeropuertos_iata_fk" FOREIGN KEY ("destino") REFERENCES "public"."aeropuertos"("iata") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida_habitaciones" DROP COLUMN "neto_centavos";--> statement-breakpoint
ALTER TABLE "partida_renglones" DROP COLUMN "neto_unitario_centavos";--> statement-breakpoint
ALTER TABLE "vuelo_tramos" DROP COLUMN "llega_dia_siguiente";--> statement-breakpoint
ALTER TABLE "vuelo_tramos" DROP COLUMN "duracion";--> statement-breakpoint
ALTER TABLE "vuelo_tramos" DROP COLUMN "escalas";