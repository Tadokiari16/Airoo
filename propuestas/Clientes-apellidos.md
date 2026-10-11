# Propuesta: apellidos de clientes (sin aplicar)

## Estado

La ficha del viaje usa el campo `clientes.nombre` completo («María José Pérez»). Antes tomaba solo la primera palabra. Esta migración no está generada ni aplicada: la base es compartida con producción y las migraciones corren al construir, así que espera el OK de Luis.

## Migración propuesta (aditiva)

```sql
ALTER TABLE clientes ADD COLUMN apellidos text;
```

- Opcional, sin valor por defecto y sin tocar filas existentes.
- `nombre` sigue guardando lo que ya tiene (no se parte automáticamente).
- Cuando exista `apellidos`, el nombre completo se arma como «nombre apellidos». `nombre_busqueda` se calcula con ambos.
- Cambios en código: `schema.ts` (una columna), el formulario de cliente nuevo (campo «Apellidos» opcional) y la búsqueda.

## Diseño

El repositorio no trae «Ficha de cliente» ni «Modal: Nuevo cliente»: solo el mapa del sistema los marca «Por rediseñar». Falta revisarlos en el canvas (página Exploración). Se necesita la liga del archivo de Figma.
