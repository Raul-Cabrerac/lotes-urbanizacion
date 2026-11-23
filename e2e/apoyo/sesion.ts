import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const USUARIOS = {
  admin: { email: 'admin@lotes.bo', password: 'admin123' },
  asesor: { email: 'asesor@lotes.bo', password: 'asesor123' },
  asesor2: { email: 'asesor2@lotes.bo', password: 'asesor123' },
  cliente: { email: 'cliente@lotes.bo', password: 'cliente123' },
  cliente2: { email: 'cliente2@lotes.bo', password: 'cliente123' },
} as const;

/** Vuelve a cargar los datos demo (la API corre con ENTORNO=pruebas). */
export async function reiniciarDatos(request: APIRequestContext): Promise<void> {
  const respuesta = await request.post('/api/pruebas/reiniciar');
  expect(respuesta.ok()).toBeTruthy();
}

/** Inicia sesión por la interfaz, como lo haría una persona. */
export async function iniciarSesionComo(page: Page, usuario: keyof typeof USUARIOS): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USUARIOS[usuario].email);
  await page.getByTestId('login-password').fill(USUARIOS[usuario].password);
  await page.getByTestId('login-ingresar').click();
  await expect(page.getByTestId('usuario-nombre')).toBeVisible();
}

/** Obtiene un token JWT directamente de la API para simular conflictos concurrentes desde otro actor. */
export async function tokenApi(request: APIRequestContext, usuario: keyof typeof USUARIOS): Promise<string> {
  const res = await request.post('/api/auth/login', { data: USUARIOS[usuario] });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { token: string };
  return body.token;
}

/** Abre el mapa del proyecto (1 = Los Jardines del Urubó después del reinicio). */
export async function abrirProyecto(page: Page, id = 1): Promise<void> {
  await page.goto('/proyectos');
  await page.getByTestId(`proyecto-${id}`).click();
  await expect(page.getByTestId('mapa')).toBeVisible();
}
