# Mapa: Google Maps

El mapa de lotes usa la **API de Google Maps (Maps JavaScript API)** con vista satelital, para ver
los terrenos reales donde se dibujan los lotes.

## 1. ¿Hace falta una clave?

- **Sin clave** el mapa funciona igual: se pueden ver, dibujar y editar lotes. Google lo muestra
  oscurecido, con la marca "For development purposes only" y un aviso al abrirlo. Sirve para
  programar y para las pruebas E2E.
- **Con clave** el mapa se ve limpio. Conviene tenerla para la presentación.

La clave va en `.env.local`, en la raíz del repositorio:

```
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

Después de cambiarla, reinicia `npm run dev`. Vite solo envía al navegador las variables que
empiezan con `VITE_`: la conexión a la base de datos nunca sale del servidor.

## 2. Cómo obtener la clave (una persona del grupo)

1. Entra a <https://console.cloud.google.com> y crea un proyecto (por ejemplo, `lotes-taller-v`).
2. **Facturación**: Google pide asociar una tarjeta aunque el uso sea gratuito. El uso de este
   proyecto queda muy por debajo del cupo gratuito mensual de Maps.
3. **APIs y servicios → Biblioteca** → busca **Maps JavaScript API** → **Habilitar**.
4. **APIs y servicios → Credenciales → Crear credenciales → Clave de API**.
5. Restringe la clave (importante, porque viaja al navegador):
   - **Restricciones de aplicación → Sitios web**: agrega `http://localhost:5173/*` y
     `http://localhost:4173/*`.
   - **Restricciones de API**: solo **Maps JavaScript API**.
6. Pasa la clave al grupo por un canal privado. Cada uno la pega en su `.env.local`.

## 3. Cómo se usa en el código

| Archivo (`frontend/src/componentes/mapa/`) | Qué hace |
|---|---|
| `cargarGoogleMaps.ts` | Carga la API una sola vez con `@googlemaps/js-api-loader` |
| `MapaLotes.tsx` | Crea el mapa, pinta los polígonos por estado, el perímetro, la selección y la edición de forma |
| `HerramientaDibujo.tsx` | Dibujo de un polígono: clic por vértice, imán a vértices vecinos, cerrar en el primer punto |
| `capaHtml.ts` | Etiquetas HTML sobre el mapa (código del lote y vértices del dibujo) |
| `aspectoLote.ts` | Colores del polígono y etiqueta con `data-testid="poligono-<código>"` |
| `geometriaMapa.ts` | Conversión entre GeoJSON `[lng, lat]` y puntos `{ lat, lng }` de Google |

Google dibuja los polígonos dentro de un canvas, sin un elemento HTML por polígono. Por eso cada
lote tiene una etiqueta HTML propia, centrada sobre el polígono, que lleva
`data-testid="poligono-<código>"` y `data-estado`. Un clic en ella selecciona el lote, igual que un
clic en el polígono. Las pruebas E2E usan esa etiqueta.

## 4. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Mapa oscuro con "For development purposes only" | No hay clave en `.env.local`, o falta reiniciar `npm run dev` |
| "Google Maps rechazó la clave" | La clave no existe, la API no está habilitada, falta la facturación o la restricción de sitios no incluye `localhost:5173` |
| "No se pudo cargar Google Maps" | Sin conexión a internet. La lista de lotes de la izquierda sigue funcionando |
| Al dibujar, un clic no agrega el punto | Dos clics muy seguidos cuentan como doble clic: espera medio segundo entre clic y clic |
