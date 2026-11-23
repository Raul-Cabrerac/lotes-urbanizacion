import type { Page } from '@playwright/test';

/** Lo que respondió la API: el estado HTTP y, si fue un error, su código (docs/API.md). */
export interface RespuestaApi {
  estado: number;
  codigo: string | null;
}

/**
 * Espera la próxima respuesta de la API a `metodo` sobre una ruta que termina en `finDeRuta`
 * (p. ej. 'POST', '/api/reservas'). Se llama ANTES de la acción y se espera DESPUÉS:
 *
 *   const respuesta = esperarRespuestaApi(page, 'POST', '/api/reservas');
 *   await page.getByTestId('reserva-confirmar').click();
 *   expect(await respuesta).toEqual({ estado: 409, codigo: 'LOTE_NO_DISPONIBLE' });
 *
 * Así un E2E comprueba que el rechazo lo decidió el servidor, por su código y no por el texto.
 */
export async function esperarRespuestaApi(page: Page, metodo: string, finDeRuta: string): Promise<RespuestaApi> {
  const respuesta = await page.waitForResponse(
    (r) => r.request().method() === metodo && new URL(r.url()).pathname.endsWith(finDeRuta),
  );
  if (respuesta.ok()) return { estado: respuesta.status(), codigo: null };
  const cuerpo = (await respuesta.json()) as { error?: { codigo?: string } };
  return { estado: respuesta.status(), codigo: cuerpo.error?.codigo ?? null };
}
