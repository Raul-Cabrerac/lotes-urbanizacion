/**
 * Cliente HTTP mínimo para la API REST.
 * Agrega el token de sesión y convierte las respuestas de error en ApiError.
 */

const CLAVE_TOKEN = 'lotes.token';

/** Error devuelto por la API: { error: { codigo, mensaje, detalles } }. */
export class ApiError extends Error {
  constructor(
    public readonly estado: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
  }
}

// El token se guarda en sessionStorage: cada pestaña tiene su propia sesión,
// así se puede probar con dos usuarios a la vez (p. ej. dos asesores).
export function leerToken(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(CLAVE_TOKEN, token);
    else sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // almacenamiento no disponible: la sesión dura hasta recargar la página
  }
}

let alExpirarSesion: () => void = () => {};

/** Lo llama el proveedor de sesión para cerrar la sesión si la API responde 401. */
export function configurarAlExpirarSesion(funcion: () => void): void {
  alExpirarSesion = funcion;
}

export async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = leerToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'SIN_CONEXION', 'No se pudo conectar con la API. ¿Está corriendo el backend?');
  }

  if (respuesta.status === 204) return undefined as T;
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = datos?.error;
    if (respuesta.status === 401 && ruta !== '/auth/login') alExpirarSesion();
    throw new ApiError(
      respuesta.status,
      error?.codigo ?? 'ERROR',
      error?.mensaje ?? `Error ${respuesta.status} al comunicarse con la API.`,
      error?.detalles,
    );
  }
  return datos as T;
}

/** Arma "?a=1&b=2" ignorando los valores vacíos. */
export function consulta(parametros: Record<string, string | number | undefined | null>): string {
  const pares = Object.entries(parametros).filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
  return pares.length ? `?${new URLSearchParams(pares.map(([k, v]) => [k, String(v)]))}` : '';
}

/** Mensaje legible de cualquier error (para mostrar en pantalla). */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    const detalles = Array.isArray(error.detalles) ? error.detalles : [];
    // Errores de importación KML: lista de textos
    if (detalles.length && typeof detalles[0] === 'string') return `${error.message}\n• ${detalles.join('\n• ')}`;
    return error.message;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
