import { Link } from 'react-router';
import { inicioSegunRol, useSesion } from '../auth/Sesion';
import { Icono } from '../componentes/Icono';

/** Se muestra cuando el usuario intenta entrar a una pantalla que su rol no permite. */
export function AccesoDenegado() {
  const { usuario } = useSesion();
  return (
    <div className="pagina-centrada" data-testid="acceso-denegado">
      <div className="tarjeta tarjeta-mensaje">
        <div className="icono-grande">
          <Icono nombre="candado" tamano={22} />
        </div>
        <h1>Acceso denegado</h1>
        <p>Su rol no tiene permiso para ver esta página.</p>
        {usuario && (
          <Link className="boton boton-primario" to={inicioSegunRol(usuario)} data-testid="acceso-denegado-volver">
            Volver al inicio
          </Link>
        )}
      </div>
    </div>
  );
}

export function NoEncontrado() {
  return (
    <div className="pagina-centrada" data-testid="no-encontrado">
      <div className="tarjeta tarjeta-mensaje">
        <div className="icono-grande">
          <Icono nombre="brujula" tamano={22} />
        </div>
        <h1>Página no encontrada</h1>
        <p>La dirección no corresponde a ninguna pantalla de la aplicación.</p>
        <Link className="boton boton-primario" to="/" data-testid="no-encontrado-volver">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
