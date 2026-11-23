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
let claveRechazada = false;
const oyentesClaveRechazada = new Set<() => void>();

async function cargar(): Promise<GoogleMaps> {
  // Google llama a esta función global cuando la clave no es válida o no está autorizada. Se
  // registra una sola vez y avisa a todos los mapas montados.
  window.gm_authFailure = () => {
    claveRechazada = true;
    oyentesClaveRechazada.forEach((avisar) => avisar());
  };
  const clave = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  setOptions({ ...(clave ? { key: clave } : {}), v: 'weekly', language: 'es', region: 'BO' });
  const [maps, core] = await Promise.all([importLibrary('maps'), importLibrary('core')]);
  return { maps, core };
}

export function cargarGoogleMaps(): Promise<GoogleMaps> {
  carga ??= cargar();
  return carga;
}

/**
 * Llama a `avisar` si Google rechaza la clave (enseguida, si ya la rechazó antes). Devuelve la
 * función para dejar de escuchar.
 */
export function alRechazarClave(avisar: () => void): () => void {
  if (claveRechazada) avisar();
  oyentesClaveRechazada.add(avisar);
  return () => {
    oyentesClaveRechazada.delete(avisar);
  };
}
