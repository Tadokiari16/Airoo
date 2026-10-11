-- Fotos de catálogo (hoteles, habitaciones y actividades) en un bucket público:
-- son las mismas que ve el cliente en su propuesta. Los documentos de viajeros
-- van en otro bucket, privado (Fase 3).
-- En local sin Supabase Storage (sin esquema storage) no hace nada: las fotos
-- se guardan en disco (ALMACEN_FOTOS=local).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('fotos', 'fotos', true, 10485760, ARRAY['image/webp'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END
$$;
