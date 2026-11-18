import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { inicioSegunRol, useSesion } from '../auth/Sesion';
import { Campo, MensajeError } from '../componentes/Basicos';
import { Marca } from '../componentes/Icono';
import { PlanoLotes } from '../componentes/PlanoLotes';
import { useEnvio } from '../utilidades/useEnvio';

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
  const { enviar, enviando, error } = useEnvio();

  if (usuario) return <Navigate to={inicioSegunRol(usuario)} replace />;

  const ingresar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(async () => {
      const usuarioActual = await iniciarSesion(email, password);
      const desde = (ubicacion.state as { desde?: string } | null)?.desde;
      navegar(desde && desde !== '/login' ? desde : inicioSegunRol(usuarioActual), { replace: true });
    });
  };

  return (
    <div className="pantalla-login">
      <main className="login-columna">
        <form className="login" onSubmit={ingresar} data-testid="formulario-login">
          <div className="login-cabecera">
            <Marca tamano={40} />
            <h1>Urbanizaciones y Lotes</h1>
            <p>Ingrese con su cuenta para ver los proyectos, el mapa de lotes y las operaciones de venta.</p>
          </div>

          <Campo etiqueta="Correo electrónico">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              data-testid="login-email"
            />
          </Campo>
          <Campo etiqueta="Contraseña">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              data-testid="login-password"
            />
          </Campo>

          <MensajeError mensaje={error} testid="login-error" />

          <button type="submit" className="boton boton-primario boton-bloque" disabled={enviando} data-testid="login-ingresar">
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>

          {import.meta.env.DEV && (
            <div className="login-demo">
              <span className="texto-suave">Usuarios de demostración: elija uno para completar el formulario.</span>
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
      </main>
      <div className="login-plano" aria-hidden="true">
        <PlanoLotes />
      </div>
    </div>
  );
}
