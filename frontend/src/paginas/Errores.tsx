import { Link } from 'react-router';
import { Icono } from '../componentes/Icono';

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
