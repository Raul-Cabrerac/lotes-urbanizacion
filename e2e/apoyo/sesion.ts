import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const USUARIOS = {
  admin: { email: 'admin@lotes.bo', password: 'admin123' },
  asesor: { email: 'asesor@lotes.bo', password: 'asesor123' },
  asesor2: { email: 'asesor2@lotes.bo', password: 'asesor123' },
  cliente: { email: 'cliente@lotes.bo', password: 'cliente123' },
  cliente2: { email: 'cliente2@lotes.bo', password: 'cliente123' },
} as const;

export async function reiniciarDatos(request: APIRequestContext): Promise<void> {
  const respuesta = await request.post('http://localhost:3000/api/pruebas/reiniciar');
  expect(respuesta.ok()).toBeTruthy();
}

export async function iniciarSesionComo(page: Page, usuario: keyof typeof USUARIOS): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USUARIOS[usuario].email);
  await page.getByTestId('login-password').fill(USUARIOS[usuario].password);
  await page.getByTestId('login-ingresar').click();
  await expect(page.getByTestId('usuario-nombre')).toBeVisible();
}

export async function abrirProyecto(page: Page, id = 1): Promise<void> {
  await page.goto('/proyectos');
  await page.getByTestId(`proyecto-${id}`).click();
  await expect(page.getByTestId('mapa')).toBeVisible();
}
