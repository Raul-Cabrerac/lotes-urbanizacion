import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend llama a "/api/..." y Vite reenvía esas peticiones al backend (puerto 3000).
const proxy = { '/api': 'http://localhost:3000' };

export default defineConfig({
  plugins: [react()],
  // Las variables se leen del .env.local de la raíz. Solo las que empiezan con VITE_ llegan al
  // navegador: DATABASE_URL y las demás claves del backend nunca salen del servidor.
  envDir: '..',
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
