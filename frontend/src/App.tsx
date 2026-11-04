import { Navigate, Route, Routes } from 'react-router';
import { RutaProtegida } from './auth/RutaProtegida';
import { inicioSegunRol, useSesion } from './auth/Sesion';
import { Layout } from './componentes/Layout';
import { ClienteDetalle } from './paginas/ClienteDetalle';
import { Clientes } from './paginas/Clientes';
import { NoEncontrado } from './paginas/Errores';
import { Login } from './paginas/Login';
import { MiPortal } from './paginas/MiPortal';
import { ProyectoMapa } from './paginas/mapa/ProyectoMapa';
import { Proyectos } from './paginas/Proyectos';
import { Reportes } from './paginas/Reportes';
import { Reservas } from './paginas/Reservas';
import { Usuarios } from './paginas/Usuarios';
import { VentaDetalle } from './paginas/VentaDetalle';
import { Ventas } from './paginas/Ventas';

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
        <Route path="/proyectos" element={<RutaProtegida permiso="proyectos:ver"><Proyectos /></RutaProtegida>} />
        <Route path="/proyectos/:id" element={<RutaProtegida permiso="lotes:ver"><ProyectoMapa /></RutaProtegida>} />
        <Route path="/clientes" element={<RutaProtegida permiso="clientes:ver"><Clientes /></RutaProtegida>} />
        <Route path="/clientes/:id" element={<RutaProtegida permiso="clientes:ver"><ClienteDetalle /></RutaProtegida>} />
        <Route path="/reservas" element={<RutaProtegida permiso="reservas:ver"><Reservas /></RutaProtegida>} />
        <Route path="/ventas" element={<RutaProtegida permiso="ventas:registrar"><Ventas /></RutaProtegida>} />
        <Route path="/ventas/:id" element={<RutaProtegida permiso="ventas:ver"><VentaDetalle /></RutaProtegida>} />
        <Route path="/usuarios" element={<RutaProtegida permiso="usuarios:gestionar"><Usuarios /></RutaProtegida>} />
        <Route path="/reportes" element={<RutaProtegida permiso="reportes:ver"><Reportes /></RutaProtegida>} />
        <Route path="/mi-portal" element={<RutaProtegida permiso="portal:ver"><MiPortal /></RutaProtegida>} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
