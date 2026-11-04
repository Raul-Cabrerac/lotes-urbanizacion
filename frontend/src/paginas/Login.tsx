import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { mensajeDeError } from '../api/http';
import { inicioSegunRol, useSesion } from '../auth/Sesion';
import { MensajeError } from '../componentes/Basicos';

/** Usuarios de los datos de demostración (solo se muestran en modo desarrollo). */
const USUARIOS_DEMO = [
  { rol: 'Administrador', email: 'admin@lotes.bo', password: 'admin123' },
  { rol: 'Asesor', email: 'asesor@lotes.bo', password: 'asesor123' },
  { rol: 'Asesor 2', email: 'asesor2@lotes.bo', password: 'asesor123' },
  { rol: 'Cliente', email: 'cliente@lotes.bo', password: 'cliente123' },
];

export function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={inicioSegunRol(usuario)} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const usuarioActual = await iniciarSesion(email, password);
      const desde = (ubicacion.state as { desde?: string } | null)?.desde;
      navegar(desde && desde !== '/login' ? desde : inicioSegunRol(usuarioActual), { replace: true });
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pantalla-login">
      <form className="tarjeta login" onSubmit={enviar} data-testid="formulario-login">
        <div className="login-cabecera">
          <span className="marca-logo grande" aria-hidden>
            ▦
          </span>
          <h1>Urbanizaciones y Lotes</h1>
          <p className="texto-suave">Proyectos, mapa de lotes, reservas, ventas y planes de pago</p>
        </div>

        <label className="campo">
          <span className="campo-etiqueta">Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            data-testid="login-email"
          />
        </label>
        <label className="campo">
          <span className="campo-etiqueta">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            data-testid="login-password"
          />
        </label>

        <MensajeError mensaje={error} testid="login-error" />

        <button type="submit" className="boton boton-primario boton-bloque" disabled={enviando} data-testid="login-ingresar">
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>

        {import.meta.env.DEV && (
          <div className="login-demo">
            <div className="texto-suave">Usuarios de demostración (clic para completar):</div>
            <div className="login-demo-botones">
              {USUARIOS_DEMO.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="boton boton-chico"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                  }}
                  data-testid={`login-demo-${u.email}`}
                >
                  {u.rol}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
