import { Link } from 'react-router';
import { Icono } from '../componentes/Icono';
import { inicioSegunRol, useSesion } from './Sesion';

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
