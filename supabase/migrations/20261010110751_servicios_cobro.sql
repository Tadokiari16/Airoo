ALTER TABLE "servicios" ADD COLUMN "nota_cobro" text;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "varia_por_reserva" boolean DEFAULT false NOT NULL;