/**
 * Puertos (interfaces) que necesita la capa de aplicación.
 *
 * Los servicios dependen de estas interfaces y no de PostgreSQL, Express o bcrypt
 * (principio de inversión de dependencias). Gracias a eso, en los tests se
 * pueden reemplazar por dobles de prueba (mocks/stubs/fakes): por ejemplo, un
 * Reloj fijo para probar vencimientos o un repositorio en memoria.
 *
 * Los repositorios están en repositorios.ts y se reexportan aquí: todo se importa desde puertos.
 */
import type { FechaISO } from '../dominio/fechas';
import type { Permiso } from '../dominio/permisos';
import type { Rol } from '../dominio/tipos';
import type { Repositorios } from './repositorios';

export type * from './repositorios';

// ----------------------------------------------------------------------------
// Servicios técnicos
// ----------------------------------------------------------------------------

/** Fuente de la fecha y hora actual (en los tests se reemplaza por una fecha fija). */
export interface Reloj {
  ahora(): Date;
  hoy(): FechaISO;
}

export interface Hasher {
  hashear(texto: string): Promise<string>;
  comparar(texto: string, hash: string): Promise<boolean>;
}

export interface DatosToken {
  usuarioId: number;
  rol: Rol;
}

export interface ServicioTokens {
  generar(datos: DatosToken): string;
  /** Lanza ErrorNoAutenticado si el token es inválido o expiró. */
  verificar(token: string): DatosToken;
}

/** Elemento (Placemark) leído de un archivo KML. */
export interface PlacemarkKml {
  nombre: string;
  propiedades: Record<string, string>; // ExtendedData, con claves en minúsculas
  geometria: unknown; // Polygon GeoJSON sin validar, o null si el elemento no es un polígono
}

export interface LectorKml {
  /** Lanza KML_INVALIDO si el contenido no es un KML legible. */
  leer(contenido: string): PlacemarkKml[];
}

/** Usuario autenticado que realiza la operación. */
export interface UsuarioActual {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  clienteId: number | null;
  permisos: Permiso[];
}

/**
 * Unidad de trabajo: agrupa varias escrituras en UNA transacción.
 * Si algo falla dentro de `transaccion`, no se guarda nada (atomicidad):
 * por ejemplo, registrar una venta y marcar el lote como VENDIDO.
 */
export interface UnidadDeTrabajo {
  readonly repos: Repositorios;
  transaccion<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T>;
}
