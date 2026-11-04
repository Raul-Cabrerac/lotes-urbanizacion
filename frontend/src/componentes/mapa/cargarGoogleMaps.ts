/**
 * Carga la API de Google Maps una sola vez para toda la aplicación.
 *
 * La clave va en VITE_GOOGLE_MAPS_API_KEY, en el archivo .env.local de la raíz del repositorio
 * (ver docs/GOOGLE_MAPS.md). Sin clave, Google muestra el mapa oscurecido y con la marca
 * "For development purposes only", pero todo funciona igual.
 */
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface GoogleMaps {
  maps: google.maps.MapsLibrary;
  core: google.maps.CoreLibrary;
}

let carga: Promise<GoogleMaps> | null = null;

async function cargar(): Promise<GoogleMaps> {
  const clave = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  setOptions({ ...(clave ? { key: clave } : {}), v: 'weekly', language: 'es', region: 'BO' });
  const [maps, core] = await Promise.all([importLibrary('maps'), importLibrary('core')]);
  return { maps, core };
}

export function cargarGoogleMaps(): Promise<GoogleMaps> {
  carga ??= cargar();
  return carga;
}
