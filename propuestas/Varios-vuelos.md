# Propuesta: más de un vuelo por cotización

Hoy el armador permite un solo vuelo por cotización. «Agregar vuelo» se deshabilita cuando ya hay uno. Esta propuesta no está implementada.

## Qué se necesita

- Vuelos internos con otra aerolínea (por ejemplo, un CUN–MID dentro del viaje).
- Boletos separados: ida con una aerolínea y regreso con otra, cada uno con su propio costo neto total.

## Propuesta

Cada vuelo pasa a ser una partida independiente con su propio «Costo neto total» y su moneda. Ya es así en el modelo (`partidas` tiene una fila por servicio); el límite está en la interfaz y en tres validaciones.

1. **Tipo de viaje por vuelo.** Cada vuelo tiene su propio tipo (sencillo, redondo o varios tramos). El texto «Edítalo para cambiar el tipo de viaje» desaparece porque cada vuelo se edita por separado.
2. **Botón «Agregar vuelo» siempre activo.** Un segundo vuelo se llama «Vuelo 2» hasta que se elija aerolínea. Las pestañas y el resumen usan «Vuelo VB», «Vuelo Y4», como hoy.
3. **Tramos repetidos.** Aviso (no error) si dos vuelos cubren la misma ruta el mismo día.

## Impacto

**Armador**
- Quitar `hayVuelo` y el texto asociado en `armador.tsx`.
- La revisión de llegada contra salida (`revisarVuelo`) ya corre por partida; solo se añade un aviso entre vuelos cuando un vuelo llega después de que sale el siguiente.
- Traslados aeropuerto–hotel: hoy se proponen con «el vuelo». Con varios, se propone con el primer vuelo que llega al destino del viaje y el último que sale de él. Se pregunta al elegir cuál si hay duda.
- TUA: ya es una fila por aeropuerto de salida; con varios vuelos hay filas repetidas si coincide el aeropuerto, y se agrupan por aeropuerto.

**Precio por persona**
- No cambia la regla: total de la opción entre pasajeros sin bebés. Cada vuelo suma su precio (neto × 1.025) al total. Con boletos separados, el precio por persona sigue siendo del viaje completo.
- Si un vuelo no lleva a todos los pasajeros (un tramo interno para dos de cuatro), el costo neto total lo cubre completo y la asesora captura el costo de quienes viajan. El sistema no reparte.

**Resumen**
- La sección Vuelos del resumen lista un renglón por vuelo, con su ruta y fechas, y un subtotal de vuelos.
- El plan de pagos ya junta los vuelos en el anticipo; no cambia.
- La vista del cliente muestra un bloque por vuelo en orden de fecha.

## Pendientes antes de construir

- Confirmar si un vuelo puede ir en una sola opción de hotel o siempre en todas.
- Confirmar cómo se muestran dos aerolíneas con equipaje distinto en la vista del cliente.
