/**
 * Datos de demostración: se cargan solos cuando el servidor arranca con la base vacía, con
 * "npm run db:reset" y, en modo pruebas, con POST /api/pruebas/reiniciar.
 *
 * Se crean usando los MISMOS servicios que usa la API, así los datos cumplen todas las reglas de
 * negocio. Para las operaciones "del pasado" se usa un reloj fijo (RelojFijo) que se mueve hacia
 * atrás en el tiempo a partir de `ahora`.
 */
import type { UsuarioActual } from '../../aplicacion/puertos';
import { aUsuarioActual } from '../../aplicacion/servicios/AuthServicio';
import { crearContenedor } from '../../contenedor';
import { aFechaISO } from '../../dominio/fechas';
import { rectanguloEnMetros, type PoligonoGeoJSON, type Posicion } from '../../dominio/geometria';
import type { Lote, Rol } from '../../dominio/tipos';
import { RelojFijo } from '../reloj';
import type { BaseDeDatos } from './baseDeDatos';

/** Usuarios para iniciar sesión (también se muestran en la pantalla de login y en el README). */
export const USUARIOS_DEMO: { rol: Rol; nombre: string; email: string; password: string }[] = [
  { rol: 'ADMIN', nombre: 'Rodrigo Aguilera', email: 'admin@lotes.bo', password: 'admin123' },
  { rol: 'ASESOR', nombre: 'Laura Vargas', email: 'asesor@lotes.bo', password: 'asesor123' },
  { rol: 'ASESOR', nombre: 'Carlos Méndez', email: 'asesor2@lotes.bo', password: 'asesor123' },
  { rol: 'CLIENTE', nombre: 'María René Banzer', email: 'cliente@lotes.bo', password: 'cliente123' },
  { rol: 'CLIENTE', nombre: 'Juan Pablo Justiniano', email: 'cliente2@lotes.bo', password: 'cliente123' },
];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

interface PlanoLote {
  codigo: string;
  manzano: string;
  etapa: string;
  precio: number;
  geometria: PoligonoGeoJSON;
}

/** Genera una fila de lotes rectangulares (medidas en metros desde un origen). */
function filaDeLotes(
  origen: Posicion,
  datos: { prefijo: string; desde: number; manzano: string; etapa: string; x: number; y: number; ancho: number; fondo: number },
  precios: number[],
): PlanoLote[] {
  return precios.map((precio, i) => ({
    codigo: `${datos.prefijo}-${String(datos.desde + i).padStart(2, '0')}`,
    manzano: datos.manzano,
    etapa: datos.etapa,
    precio,
    geometria: rectanguloEnMetros(origen, datos.x + i * datos.ancho, datos.y, datos.ancho, datos.fondo),
  }));
}

/** Tablas con datos del negocio (la tabla `migraciones` no se toca). */
const TABLAS = ['pagos', 'cuotas', 'ventas', 'reservas', 'lotes', 'proyectos', 'usuarios', 'clientes'];

/** true si todavía no hay ningún usuario: la base recién se creó. */
export async function baseSinDatos(bd: BaseDeDatos): Promise<boolean> {
  const { rows } = await bd.sql.query<{ cantidad: number }>('SELECT count(*) AS cantidad FROM usuarios');
  return rows[0]?.cantidad === 0;
}

/** Borra todos los datos (no el esquema) y reinicia los id en 1. */
export async function vaciarDatos(bd: BaseDeDatos): Promise<void> {
  await bd.sql.query(`TRUNCATE ${TABLAS.join(', ')} RESTART IDENTITY CASCADE`);
}

/** Vacía la base y vuelve a cargar los datos de demostración. */
export async function reiniciarDatosDemo(bd: BaseDeDatos, ahora: Date): Promise<void> {
  await vaciarDatos(bd);
  await cargarDatosDemo(bd, ahora);
}

/** Carga los datos de demostración. `ahora` es la fecha "actual" de la demostración. */
export async function cargarDatosDemo(bd: BaseDeDatos, ahora: Date): Promise<void> {
  const haceDias = (dias: number) => new Date(ahora.getTime() - dias * MS_POR_DIA);
  const fechaEnDias = (dias: number) => aFechaISO(new Date(ahora.getTime() + dias * MS_POR_DIA)); // 'AAAA-MM-DD'
  const reloj = new RelojFijo(ahora);
  const s = crearContenedor({ bd, jwtSecreto: 'datos-demo', jwtExpiraEn: '1h', reloj });

  // --- Clientes ---------------------------------------------------------------
  const maria = await s.clientes.crear({
    nombreCompleto: 'María René Banzer',
    documento: '4839201',
    telefono: '70012345',
    email: 'maria.banzer@correo.bo',
    direccion: 'Av. Beni, 3er anillo, Santa Cruz',
  });
  const juanPablo = await s.clientes.crear({
    nombreCompleto: 'Juan Pablo Justiniano',
    documento: '6201457',
    telefono: '76543210',
    email: 'jp.justiniano@correo.bo',
    direccion: 'Barrio Equipetrol, calle 7 Este',
  });
  const ana = await s.clientes.crear({
    nombreCompleto: 'Ana Lucía Rojas',
    documento: '5512893',
    telefono: '71234567',
    email: 'ana.rojas@correo.bo',
    direccion: 'Urb. Las Palmas, Santa Cruz',
  });
  const pedro = await s.clientes.crear({
    nombreCompleto: 'Pedro Suárez Antelo',
    documento: '7340012',
    telefono: '77788899',
    email: '',
    direccion: 'Montero, Santa Cruz',
  });

  // --- Usuarios ---------------------------------------------------------------
  const clientePorEmail: Record<string, number> = { 'cliente@lotes.bo': maria.id, 'cliente2@lotes.bo': juanPablo.id };
  const usuarios: Record<string, UsuarioActual> = {};
  for (const u of USUARIOS_DEMO) {
    const creado = await s.usuarios.crear({ ...u, clienteId: clientePorEmail[u.email] ?? null });
    usuarios[u.email] = aUsuarioActual(creado);
  }
  const laura = usuarios['asesor@lotes.bo'];
  const carlos = usuarios['asesor2@lotes.bo'];

  // --- Proyecto 1: publicado, 22 lotes en 3 manzanos y 2 etapas ---------------
  const jardines = await s.proyectos.crear({
    nombre: 'Urbanización Los Jardines del Urubó',
    descripcion: 'Urbanización residencial con áreas verdes, calles enripiadas y servicios básicos.',
    ubicacion: 'Urubó, Porongo - Santa Cruz',
  });
  const origenJardines: Posicion = [-63.2275, -17.7563];
  const planoJardines = [
    // Manzano A (Etapa 1): lotes de 12 x 30 m. A-05 es el ejemplo de la consigna (Bs 75.000).
    ...filaDeLotes(origenJardines, { prefijo: 'A', desde: 1, manzano: 'A', etapa: 'Etapa 1', x: 0, y: 0, ancho: 12, fondo: 30 }, [78000, 72000, 72000, 78000]),
    ...filaDeLotes(origenJardines, { prefijo: 'A', desde: 5, manzano: 'A', etapa: 'Etapa 1', x: 0, y: 30, ancho: 12, fondo: 30 }, [75000, 70000, 70000, 82000]),
    // Manzano B (Etapa 1)
    ...filaDeLotes(origenJardines, { prefijo: 'B', desde: 1, manzano: 'B', etapa: 'Etapa 1', x: 60, y: 0, ancho: 12, fondo: 30 }, [70000, 68000, 66000, 70000]),
    ...filaDeLotes(origenJardines, { prefijo: 'B', desde: 5, manzano: 'B', etapa: 'Etapa 1', x: 60, y: 30, ancho: 12, fondo: 30 }, [70000, 66000, 66000, 72000]),
    // Manzano C (Etapa 2): lotes de 15 x 25 m
    ...filaDeLotes(origenJardines, { prefijo: 'C', desde: 1, manzano: 'C', etapa: 'Etapa 2', x: 0, y: 72, ancho: 15, fondo: 25 }, [62000, 60000, 62000]),
    ...filaDeLotes(origenJardines, { prefijo: 'C', desde: 4, manzano: 'C', etapa: 'Etapa 2', x: 0, y: 97, ancho: 15, fondo: 25 }, [64000, 60000, 64000]),
  ];
  const lotes: Record<string, Lote> = {};
  for (const plano of planoJardines) lotes[plano.codigo] = await s.lotes.crear(jardines.id, plano);
  await s.proyectos.definirLimite(jardines.id, rectanguloEnMetros(origenJardines, -10, -10, 128, 142));
  await s.proyectos.publicar(jardines.id);

  // --- Proyecto 2: en borrador (solo lo ve el administrador) ------------------
  const palmeras = await s.proyectos.crear({
    nombre: 'Condominio Las Palmeras',
    descripcion: 'Condominio cerrado en preparación. Falta asignar precio al lote P-04 y publicarlo.',
    ubicacion: 'Zona Norte, 6to anillo - Santa Cruz',
  });
  const origenPalmeras: Posicion = [-63.1745, -17.728];
  for (const plano of filaDeLotes(
    origenPalmeras,
    { prefijo: 'P', desde: 1, manzano: '1', etapa: 'Etapa 1', x: 0, y: 0, ancho: 15, fondo: 30 },
    [95000, 95000, 98000, 0],
  )) {
    await s.lotes.crear(palmeras.id, plano);
  }

  // --- Operaciones en el pasado ----------------------------------------------
  // 1) Venta financiada de A-05 (el ejemplo de la consigna): precio 75.000,
  //    inicial 15.000 y 12 cuotas de 5.000. Se pagó la cuota 1 => pagado 20.000, saldo 55.000.
  reloj.fijar(haceDias(45));
  const ventaA05 = await s.ventas.registrar(
    { loteId: lotes['A-05'].id, clienteId: maria.id, modalidad: 'FINANCIADO', cuotaInicial: 15000, numeroCuotas: 12, metodoPago: 'TRANSFERENCIA' },
    laura,
  );
  reloj.fijar(haceDias(16));
  await s.pagos.registrar(ventaA05.id, { cuotaId: cuotaNumero(ventaA05.cuotas, 1), monto: 5000, metodo: 'QR' }, laura);

  // 2) Venta financiada de B-02 con una cuota VENCIDA (se pagaron las cuotas 1 y 2).
  reloj.fijar(haceDias(100));
  const ventaB02 = await s.ventas.registrar(
    { loteId: lotes['B-02'].id, clienteId: juanPablo.id, modalidad: 'FINANCIADO', cuotaInicial: 8000, numeroCuotas: 24 },
    carlos,
  );
  reloj.fijar(haceDias(70));
  await s.pagos.registrar(ventaB02.id, { cuotaId: cuotaNumero(ventaB02.cuotas, 1), monto: 2500 }, carlos);
  reloj.fijar(haceDias(41));
  await s.pagos.registrar(ventaB02.id, { cuotaId: cuotaNumero(ventaB02.cuotas, 2), monto: 2500, metodo: 'TRANSFERENCIA' }, carlos);

  // 3) Reserva que luego se convirtió en venta al contado (A-08, Ana).
  reloj.fijar(haceDias(30));
  await s.reservas.crear({ loteId: lotes['A-08'].id, clienteId: ana.id, observacion: 'Pagará al contado la próxima semana.' }, laura);
  reloj.fijar(haceDias(24));
  await s.ventas.registrar({ loteId: lotes['A-08'].id, clienteId: ana.id, modalidad: 'CONTADO', metodoPago: 'TRANSFERENCIA' }, laura);

  // 4) Reserva cancelada (C-02 vuelve a estar DISPONIBLE).
  reloj.fijar(haceDias(12));
  const reservaC02 = await s.reservas.crear({ loteId: lotes['C-02'].id, clienteId: juanPablo.id }, carlos);
  reloj.fijar(haceDias(10));
  await s.reservas.cancelar(reservaC02.id, 'El cliente prefirió un lote en el manzano B.', carlos);

  // 5) Reserva que VENCIÓ hace 3 días (se procesa al final: C-03 vuelve a DISPONIBLE).
  reloj.fijar(haceDias(10));
  await s.reservas.crear(
    { loteId: lotes['C-03'].id, clienteId: pedro.id, fechaVencimiento: fechaEnDias(-3) },
    laura,
  );

  // --- Situación actual ---------------------------------------------------------
  reloj.fijar(ahora);
  await s.reservas.crear(
    { loteId: lotes['A-03'].id, clienteId: maria.id, fechaVencimiento: fechaEnDias(7), observacion: 'Interesada en financiar a 24 meses.' },
    laura,
  );
  await s.reservas.crear(
    { loteId: lotes['B-05'].id, clienteId: pedro.id, fechaVencimiento: fechaEnDias(3) },
    carlos,
  );
  await s.lotes.cambiarEstado(lotes['C-06'].id, 'BLOQUEADO'); // p. ej. en revisión de límites
  await s.reservas.procesarVencidas();
}

function cuotaNumero(cuotas: { id: number; numero: number }[], numero: number): number {
  const cuota = cuotas.find((c) => c.numero === numero);
  if (!cuota) throw new Error(`No existe la cuota ${numero}`);
  return cuota.id;
}
