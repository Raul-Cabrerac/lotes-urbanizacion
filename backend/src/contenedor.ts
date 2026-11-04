/**
 * Raíz de composición: aquí (y solo aquí) se crean las implementaciones concretas y se inyectan
 * en los servicios.
 *
 * Para una prueba de integración se crea un contenedor con una base en memoria y un reloj fijo:
 *   const bd = await abrirBaseDeDatos();   // sin url: PostgreSQL en memoria, vacío
 *   const servicios = crearContenedor({ bd, jwtSecreto: 'test', jwtExpiraEn: '1h', reloj });
 */
import type { Reloj } from './aplicacion/puertos';
import { AuthServicio } from './aplicacion/servicios/AuthServicio';
import { ClienteServicio } from './aplicacion/servicios/ClienteServicio';
import { ImportacionKmlServicio } from './aplicacion/servicios/ImportacionKmlServicio';
import { LoteServicio } from './aplicacion/servicios/LoteServicio';
import { PagoServicio } from './aplicacion/servicios/PagoServicio';
import { PortalServicio } from './aplicacion/servicios/PortalServicio';
import { ProyectoServicio } from './aplicacion/servicios/ProyectoServicio';
import { ReporteServicio } from './aplicacion/servicios/ReporteServicio';
import { ReservaServicio } from './aplicacion/servicios/ReservaServicio';
import { UsuarioServicio } from './aplicacion/servicios/UsuarioServicio';
import { VentaServicio } from './aplicacion/servicios/VentaServicio';
import type { BaseDeDatos } from './infraestructura/bd/baseDeDatos';
import { UnidadDeTrabajoSql } from './infraestructura/bd/UnidadDeTrabajoSql';
import { LectorKmlXml } from './infraestructura/kml/LectorKmlXml';
import { RelojSistema } from './infraestructura/reloj';
import { HasherBcrypt, ServicioTokensJwt } from './infraestructura/seguridad';

export interface Dependencias {
  bd: BaseDeDatos;
  jwtSecreto: string;
  jwtExpiraEn: string;
  reloj?: Reloj;
  /** Costo de bcrypt: 10 en uso normal; 4 en pruebas para que sean rápidas. */
  bcryptRondas?: number;
}

export function crearContenedor({
  bd,
  jwtSecreto,
  jwtExpiraEn,
  reloj = new RelojSistema(),
  bcryptRondas = 10,
}: Dependencias) {
  const uow = new UnidadDeTrabajoSql(bd);
  const hasher = new HasherBcrypt(bcryptRondas);
  const tokens = new ServicioTokensJwt(jwtSecreto, jwtExpiraEn);

  const proyectos = new ProyectoServicio(uow);
  const ventas = new VentaServicio(uow, reloj);

  return {
    auth: new AuthServicio(uow, hasher, tokens),
    proyectos,
    lotes: new LoteServicio(uow, proyectos, reloj),
    importacionKml: new ImportacionKmlServicio(uow, proyectos, new LectorKmlXml()),
    clientes: new ClienteServicio(uow, ventas),
    reservas: new ReservaServicio(uow, reloj),
    ventas,
    pagos: new PagoServicio(uow, ventas, reloj),
    usuarios: new UsuarioServicio(uow, hasher),
    portal: new PortalServicio(uow, ventas),
    reportes: new ReporteServicio(uow, reloj),
  };
}

export type Servicios = ReturnType<typeof crearContenedor>;
