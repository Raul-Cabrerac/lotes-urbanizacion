import { NavLink, Outlet, useNavigate } from 'react-router';
import type { Permiso } from '../api/tipos';
import { useSesion } from '../auth/Sesion';
import { NOMBRE_ROL } from '../utilidades/formato';

const MENU: { ruta: string; texto: string; permiso: Permiso }[] = [
  { ruta: '/proyectos', texto: 'Proyectos y mapa', permiso: 'proyectos:ver' },
  { ruta: '/clientes', texto: 'Clientes', permiso: 'clientes:ver' },
  { ruta: '/reservas', texto: 'Reservas', permiso: 'reservas:ver' },
  { ruta: '/ventas', texto: 'Ventas y pagos', permiso: 'ventas:registrar' },
  { ruta: '/reportes', texto: 'Reportes', permiso: 'reportes:ver' },
  { ruta: '/usuarios', texto: 'Usuarios', permiso: 'usuarios:gestionar' },
  { ruta: '/mi-portal', texto: 'Mis lotes', permiso: 'portal:ver' },
];

/** Estructura común: barra superior con el menú según el rol y el contenido de la página. */
export function Layout() {
  const { usuario, puede, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  if (!usuario) return null;

  const salir = () => {
    cerrarSesion();
    navegar('/login');
  };

  return (
    <div className="aplicacion">
      <header className="barra-superior">
        <div className="marca">
          <span className="marca-logo" aria-hidden>
            ▦
          </span>
          <span>Urbanizaciones</span>
        </div>
        <nav className="menu" data-testid="menu">
          {MENU.filter((item) => puede(item.permiso)).map((item) => (
            <NavLink key={item.ruta} to={item.ruta} data-testid={`menu-${item.ruta.slice(1)}`}>
              {item.texto}
            </NavLink>
          ))}
        </nav>
        <div className="usuario-actual">
          <div className="usuario-datos">
            <strong data-testid="usuario-nombre">{usuario.nombre}</strong>
            <span data-testid="usuario-rol">{NOMBRE_ROL[usuario.rol]}</span>
          </div>
          <button type="button" className="boton boton-claro" onClick={salir} data-testid="boton-salir">
            Salir
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
