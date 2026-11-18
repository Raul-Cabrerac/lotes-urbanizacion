/**
 * Lo que las pruebas de integración suponen de los datos demo (src/datosDemo.ts, cargados con
 * HOY): cada constante dice qué dato es y en qué estado lo encuentra una prueba recién empezada.
 * Si cambian los datos demo, se corrige aquí y no en cada prueba. Tabla completa en
 * docs/GUIA_TESTING.md §5.
 */

/** PUBLICADO, con 22 lotes en los manzanos A, B y C. Los lotes de abajo son de este proyecto. */
export const PROYECTO_PUBLICADO = 'Urbanización Los Jardines del Urubó';
/** BORRADOR (solo lo ve el administrador), con los lotes P-01 a P-04. */
export const PROYECTO_BORRADOR = 'Condominio Las Palmeras';

/** DISPONIBLE, sin reservas ni ventas: se puede reservar, vender o eliminar. */
export const LOTE_DISPONIBLE = 'A-01';
/** DISPONIBLE, sin reservas ni ventas (un segundo lote libre). */
export const OTRO_LOTE_DISPONIBLE = 'A-02';
/** RESERVADO por María René Banzer; la reserva vence en 7 días. */
export const LOTE_RESERVADO = 'A-03';
/** RESERVADO por Pedro Suárez Antelo; la reserva vence en 3 días. */
export const LOTE_RESERVA_POR_VENCER = 'B-05';
/** VENDIDO financiado a María: inicial 15 000 y cuota 1 pagadas (pagos VALIDOS), saldo 55 000. */
export const LOTE_VENDIDO_FINANCIADO = 'A-05';

/**
 * Días que hay que adelantar el reloj para que venza la reserva de LOTE_RESERVA_POR_VENCER
 * (3 días) y no la de LOTE_RESERVADO (7 días). Una reserva vence el día siguiente a su fecha.
 */
export const DIAS_PARA_QUE_VENZA_B05 = 5;

/** Documento (CI/NIT) de cada cliente demo. */
export const DOCUMENTOS = {
  /** María René Banzer: usuaria del portal cliente@lotes.bo; reservó A-03 y compró A-05. */
  maria: '4839201',
  /** Juan Pablo Justiniano: usuario del portal cliente2@lotes.bo; compró B-02. */
  juanPablo: '6201457',
  /** Ana Lucía Rojas: sin usuario del portal ni reservas activas; compró A-08. */
  ana: '5512893',
  /** Pedro Suárez Antelo: sin usuario del portal; reservó B-05. */
  pedro: '7340012',
} as const;
