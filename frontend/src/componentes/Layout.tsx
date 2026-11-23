import { useLayoutEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { inicioSegunRol, useSesion, useUsuarioActual } from '../auth/Sesion';
import { PANTALLAS } from '../rutas';
import { NOMBRE_ROL } from '../utilidades/estados';
import { Icono, Marca } from './Icono';

/** Enlaces del menú, en el orden de rutas.ts: cada uno se muestra solo si el usuario tiene el permiso. */
const MENU = PANTALLAS.flatMap(({ ruta, permiso, menu }) => (menu ? [{ ruta, permiso, ...menu }] : []));

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

/**
 * El menú va en línea si la fila completa (marca, enlaces y usuario) entra en la barra; si no,
 * se pliega en un popover detrás del botón "Menú". No hay un ancho fijo de corte: se mide la
 * fila, así que agregar un enlace o agrandar el texto mueve el punto solo.
 */
function useMenuPlegable() {
  const cabecera = useRef<HTMLElement>(null);
  const fila = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const header = cabecera.current;
    const interior = fila.current;
    const menu = lista.current;
    if (!header || !interior || !menu) return;
    let anchoMedido = 0;

    const medir = () => {
      const ancho = header.clientWidth;
      const enLinea = header.hasAttribute('data-ancha');
      // Plegado, solo vale la pena volver a medir si la barra creció.
      if (!enLinea && ancho <= anchoMedido) return;
      anchoMedido = ancho;
      const estabaAbierto = menu.matches(':popover-open');
      header.setAttribute('data-midiendo', '');
      header.setAttribute('data-ancha', '');
      menu.removeAttribute('popover');
      const entra = interior.scrollWidth <= interior.clientWidth;
      if (!entra) {
        header.removeAttribute('data-ancha');
        menu.setAttribute('popover', 'auto');
        if (estabaAbierto) menu.showPopover();
      }
      requestAnimationFrame(() => header.removeAttribute('data-midiendo'));
    };

    const observador = new ResizeObserver(medir);
    observador.observe(header);
    observador.observe(menu);
    return () => observador.disconnect();
  }, []);

  /** Al elegir un enlace del menú plegado, el popover se cierra (la navegación no recarga la página). */
  const cerrarSiPlegado = () => {
    if (lista.current?.matches(':popover-open')) lista.current.hidePopover();
  };

  return { cabecera, fila, lista, cerrarSiPlegado };
}

/** Estructura común: barra superior con el menú según el rol y el contenido de la página. */
export function Layout() {
  const { puede, cerrarSesion } = useSesion();
  const usuario = useUsuarioActual();
  const navegar = useNavigate();
  const { cabecera, fila, lista, cerrarSiPlegado } = useMenuPlegable();

  const salir = () => {
    cerrarSesion();
    navegar('/login');
  };

  return (
    <div className="aplicacion">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="barra-superior" ref={cabecera}>
        <div className="barra-interior" ref={fila}>
          <Link to={inicioSegunRol(usuario)} className="marca">
            <Marca />
            <span>Urbanizaciones</span>
          </Link>
          <nav className="navegacion" aria-label="Principal" data-testid="menu">
            <button
              type="button"
              className="boton boton-fantasma menu-boton"
              popoverTarget="menu-principal"
              aria-controls="menu-principal"
            >
              <Icono nombre="menu" />
              <span>Menú</span>
            </button>
            <ul className="menu-lista" id="menu-principal" ref={lista}>
              {MENU.filter((item) => puede(item.permiso)).map((item) => (
                <li key={item.ruta}>
                  <NavLink to={item.ruta} onClick={cerrarSiPlegado} data-testid={item.testid}>
                    {item.texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="usuario-actual">
            <div className="usuario-datos">
              <strong data-testid="usuario-nombre">{usuario.nombre}</strong>
              <span data-testid="usuario-rol">{NOMBRE_ROL[usuario.rol]}</span>
            </div>
            <span className="avatar" aria-hidden="true">
              {iniciales(usuario.nombre)}
            </span>
            <button type="button" className="boton boton-chico boton-fantasma" onClick={salir} data-testid="boton-salir">
              <Icono nombre="salir" />
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="contenido" id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
