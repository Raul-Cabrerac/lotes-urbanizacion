/**
 * Validación de la FORMA de los datos de entrada con zod (tipos, campos
 * obligatorios, formatos). Las reglas de negocio se validan en src/dominio.
 */
import { z } from 'zod';
import { esFechaISO } from '../dominio/fechas';
import { ErrorValidacion } from '../dominio/errores';
import { LARGO_MAXIMO } from '../dominio/lote';
import { POR_PAGINA_MAXIMA, POR_PAGINA_POR_DEFECTO, type Paginacion } from '../dominio/paginacion';
import {
  ESTADOS_LOTE,
  ESTADOS_RESERVA,
  ESTADOS_VENTA,
  METODOS_PAGO,
  MODALIDADES_PAGO,
  ROLES,
} from '../dominio/tipos';

z.config(z.locales.es()); // mensajes de zod en español

/** Valida `datos` con el esquema; si no cumple lanza ErrorValidacion (HTTP 400) con el detalle por campo. */
export function parsear<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  const resultado = esquema.safeParse(datos ?? {});
  if (!resultado.success) {
    const detalles = resultado.error.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensaje: issue.message,
    }));
    const resumen = detalles.map((d) => (d.campo ? `${d.campo}: ${d.mensaje}` : d.mensaje)).join(' · ');
    throw new ErrorValidacion(`Datos inválidos. ${resumen}`, detalles);
  }
  return resultado.data;
}

/** Lee un id numérico de la URL (/lotes/:id). */
export function leerId(valor: unknown): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorValidacion(`Identificador inválido: "${valor}".`);
  return id;
}

// ---------------------------------------------------------------------------
// Piezas reutilizables
// ---------------------------------------------------------------------------

const obligatorio = (campo: string, max = 200) =>
  z
    .string({ error: `${campo} es obligatorio.` })
    .trim()
    .min(1, `${campo} es obligatorio.`)
    .max(max, `${campo} admite como máximo ${max} caracteres.`);

const opcional = (max = 500) => z.string().trim().max(max).optional();
const numero = (campo: string) => z.number({ error: `${campo} debe ser un número.` });
const id = (campo: string) => z.number({ error: `Seleccione ${campo}.` }).int().positive();
const fecha = z.string().refine(esFechaISO, 'Fecha inválida (formato AAAA-MM-DD).');

/** En la URL los filtros llegan como texto; "" se trata como "sin filtro". */
const filtro = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((valor) => (valor === '' ? undefined : valor), esquema.optional());

/** Ningún listado llega a tantas páginas: el tope evita pedirle a la base un OFFSET absurdo. */
const PAGINA_MAXIMA = 100_000;

const camposProyecto = {
  nombre: obligatorio('El nombre', 120),
  descripcion: opcional(1000),
  ubicacion: obligatorio('La ubicación', 200),
};

const camposCliente = {
  nombreCompleto: obligatorio('El nombre completo', 120),
  documento: obligatorio('El documento de identidad', 30),
  telefono: obligatorio('El teléfono', 30),
  email: z.union([z.literal(''), z.email('Correo electrónico inválido.')]),
  direccion: opcional(200),
};

// ---------------------------------------------------------------------------
// Esquemas por operación
// ---------------------------------------------------------------------------

export const esquemas = {
  login: z.object({
    email: obligatorio('El correo'),
    password: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.'),
  }),

  proyecto: z.object({ ...camposProyecto, descripcion: opcional(1000).default('') }),
  /** Edición parcial: solo se cambian los campos enviados (sin valores por defecto). */
  proyectoEdicion: z.object(camposProyecto).partial(),

  lote: z.object({
    codigo: obligatorio('El código', LARGO_MAXIMO.codigo),
    manzano: opcional(LARGO_MAXIMO.manzano),
    etapa: opcional(LARGO_MAXIMO.etapa),
    precio: numero('El precio').optional(),
    superficieM2: numero('La superficie').nullable().optional(),
    dimensiones: opcional(LARGO_MAXIMO.dimensiones),
    geometria: z.unknown().refine((g) => g !== undefined, 'La geometría (polígono) es obligatoria.'),
  }),

  geometria: z.object({ geometria: z.unknown() }),

  importarKml: z.object({
    kml: z.string({ error: 'Adjunte el contenido del archivo KML.' }).min(1, 'El archivo KML está vacío.'),
    precioPorDefecto: numero('El precio por defecto').optional(),
    manzanoPorDefecto: opcional(LARGO_MAXIMO.manzano),
    etapaPorDefecto: opcional(LARGO_MAXIMO.etapa),
  }),

  estadoLote: z.object({ estado: z.enum(ESTADOS_LOTE) }),

  filtrosLotes: z.object({
    estado: filtro(z.enum(ESTADOS_LOTE)),
    manzano: filtro(z.string()),
    etapa: filtro(z.string()),
    q: filtro(z.string()),
  }),

  // Un q repetido (?q=a&q=b) llega como lista: se ignora y se listan todos, como antes.
  filtrosClientes: z.object({ q: filtro(z.string()).catch(undefined) }),

  cliente: z.object({
    ...camposCliente,
    email: camposCliente.email.optional().default(''),
    direccion: opcional(200).default(''),
  }),
  /** Edición parcial: solo se cambian los campos enviados (sin valores por defecto). */
  clienteEdicion: z.object(camposCliente).partial(),

  reserva: z.object({
    loteId: id('un lote'),
    clienteId: id('un cliente'),
    fechaVencimiento: fecha.nullable().optional(),
    observacion: opcional(500),
    anticipo: numero('El anticipo'),
    metodoAnticipo: z.enum(METODOS_PAGO).optional(),
  }),

  filtrosReservas: z.object({
    estado: filtro(z.enum(ESTADOS_RESERVA)),
    clienteId: filtro(z.coerce.number().int().positive()),
    proyectoId: filtro(z.coerce.number().int().positive()),
    loteId: filtro(z.coerce.number().int().positive()),
  }),

  motivoOpcional: z.object({ motivo: opcional(300).default('') }),
  motivo: z.object({ motivo: obligatorio('El motivo', 300) }),

  venta: z.object({
    loteId: id('un lote'),
    clienteId: id('un cliente'),
    modalidad: z.enum(MODALIDADES_PAGO),
    precioPactado: numero('El precio pactado').optional(),
    cuotaInicial: numero('La cuota inicial').optional(),
    numeroCuotas: numero('El número de cuotas').optional(),
    fechaPrimeraCuota: fecha.optional(),
    metodoPago: z.enum(METODOS_PAGO).optional(),
  }),

  simulacionPlan: z.object({
    modalidad: z.enum(MODALIDADES_PAGO),
    precioPactado: numero('El precio pactado'),
    cuotaInicial: numero('La cuota inicial').optional(),
    numeroCuotas: numero('El número de cuotas').optional(),
    fechaPrimeraCuota: fecha.optional(),
  }),

  filtrosVentas: z.object({
    estado: filtro(z.enum(ESTADOS_VENTA)),
    clienteId: filtro(z.coerce.number().int().positive()),
    proyectoId: filtro(z.coerce.number().int().positive()),
  }),

  /** ?pagina=&porPagina= de los listados (se leen con leerPaginacion). */
  paginacion: z.object({
    pagina: filtro(
      z.coerce
        .number()
        .int('La página debe ser un número entero.')
        .min(1, 'La primera página es la 1.')
        .max(PAGINA_MAXIMA, `La página no puede pasar de ${PAGINA_MAXIMA}.`),
    ),
    porPagina: filtro(
      z.coerce
        .number()
        .int('La cantidad por página debe ser un número entero.')
        .min(1, 'Pida al menos un registro por página.')
        .max(POR_PAGINA_MAXIMA, `Se muestran como máximo ${POR_PAGINA_MAXIMA} registros por página.`),
    ),
  }),

  pago: z.object({
    cuotaId: id('una cuota'),
    monto: numero('El monto'),
    metodo: z.enum(METODOS_PAGO).optional(),
    referencia: opcional(100),
  }),

  usuario: z.object({
    nombre: obligatorio('El nombre', 120),
    email: z.email('Correo electrónico inválido.'),
    password: z.string({ error: 'La contraseña es obligatoria.' }),
    rol: z.enum(ROLES),
    clienteId: z.number().int().positive().nullable().optional(),
  }),

  estadoUsuario: z.object({ activo: z.boolean({ error: 'Indique si el usuario está activo.' }) }),
};

/**
 * La página pedida en la URL (?pagina=2&porPagina=20). Sin ninguno de los dos devuelve null y el
 * listado sale completo, como antes: así siguen funcionando el mapa y los selectores de cliente.
 */
export function leerPaginacion(consulta: unknown): Paginacion | null {
  const { pagina, porPagina } = parsear(esquemas.paginacion, consulta);
  if (pagina === undefined && porPagina === undefined) return null;
  return { pagina: pagina ?? 1, porPagina: porPagina ?? POR_PAGINA_POR_DEFECTO };
}
