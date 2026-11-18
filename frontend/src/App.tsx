import { Navigate, Route, Routes } from 'react-router';
import { RutaProtegida } from './auth/RutaProtegida';
import { inicioSegunRol, useSesion } from './auth/Sesion';
import { Layout } from './componentes/Layout';
import { NoEncontrado } from './paginas/Errores';
import { Login } from './paginas/Login';
import { PANTALLAS } from './rutas';

function Inicio() {
  const { usuario } = useSesion();
  return <Navigate to={usuario ? inicioSegunRol(usuario) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Inicio />} />
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        {PANTALLAS.map(({ ruta, permiso, Pagina }) => (
          <Route
            key={ruta}
            path={ruta}
            element={
              <RutaProtegida permiso={permiso}>
                <Pagina />
              </RutaProtegida>
            }
          />
        ))}
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
