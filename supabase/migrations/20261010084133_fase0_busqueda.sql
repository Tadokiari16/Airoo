-- Búsqueda de ciudades parecidas («San Cristóbal» en Chiapas, Táchira y Tenerife).
-- En Supabase las extensiones viven en el esquema «extensions».
CREATE SCHEMA IF NOT EXISTS extensions;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ciudades_nombre_trgm
  ON public.ciudades USING gin (nombre_busqueda extensions.gin_trgm_ops);--> statement-breakpoint

-- Nadie lee estas tablas por la API pública: RLS está encendido sin políticas
-- y además se quitan los permisos a los roles de la API.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
