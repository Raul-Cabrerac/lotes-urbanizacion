import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { configurarHttp } from './api/http';
import { App } from './App';
import { ProveedorSesion } from './auth/Sesion';
import { guardarSesion, sesionGuardada } from './auth/sesionGuardada';
import { ProveedorAvisos } from './componentes/Avisos';
import './estilos.css';

// Cada petición lleva el token de la sesión; si la API lo rechaza, la sesión se cierra.
configurarHttp({
  obtenerToken: () => sesionGuardada()?.token ?? null,
  alNoAutenticado: () => guardarSesion(null),
});

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html.');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorAvisos>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </ProveedorAvisos>
    </BrowserRouter>
  </StrictMode>,
);
