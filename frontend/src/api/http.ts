/**
 * Cliente HTTP mínimo para la API REST.
 * Agrega el token de sesión y convierte las respuestas de error en ApiError.
 */

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

interface ConfiguracionHttp {
  /** Token de la sesión actual (null si no hay sesión). */
  obtenerToken(): string | null;
  /** La API rechazó el token de una petición (401): la sesión ya no vale. */
  alNoAutenticado(): void;
}

let configuracion: ConfiguracionHttp = { obtenerToken: () => null, alNoAutenticado: () => {} };

/** Se llama una vez, al arrancar la aplicación (main.tsx). */
export function configurarHttp(nueva: ConfiguracionHttp): void {
  configuracion = nueva;
}

export async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = configuracion.obtenerToken();
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
    // Un 401 sin token (p. ej. una contraseña incorrecta en el login) no cierra ninguna sesión.
    if (respuesta.status === 401 && token) configuracion.alNoAutenticado();
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

/** `detalles` es una lista de textos (p. ej. un error por línea del KML), no los objetos de zod. */
function esListaDeTextos(detalles: unknown): detalles is string[] {
  return Array.isArray(detalles) && detalles.length > 0 && detalles.every((d) => typeof d === 'string');
}

/** Mensaje legible de cualquier error (para mostrar en pantalla). */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    // Si `detalles` trae textos, cada uno va como viñeta debajo del mensaje.
    if (esListaDeTextos(error.detalles)) return `${error.message}\n• ${error.detalles.join('\n• ')}`;
    return error.message;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
