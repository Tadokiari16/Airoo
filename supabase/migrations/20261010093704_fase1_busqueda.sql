-- Búsqueda sin acentos y aviso de nombres parecidos en los catálogos
-- (hoteles duplicados, proveedores con el mismo nombre).
CREATE INDEX IF NOT EXISTS proveedores_nombre_trgm
  ON public.proveedores USING gin (nombre_busqueda extensions.gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS hoteles_nombre_trgm
  ON public.hoteles USING gin (nombre_busqueda extensions.gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS actividades_nombre_trgm
  ON public.actividades USING gin (nombre_busqueda extensions.gin_trgm_ops);--> statement-breakpoint

-- Igual que en la Fase 0: nadie lee los catálogos por la API pública.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
