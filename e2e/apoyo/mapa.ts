import { expect, type Page } from '@playwright/test';

/**
 * Google Maps toma dos clics separados por menos de ~0,3 s como un doble clic y descarta el
 * segundo (medido: con 0,2 s se perdían vértices; con 0,3 s o más, ninguno). Por eso el dibujo
 * espera 0,5 s antes de cada clic, como lo haría una persona. Es la única espera fija de los E2E
 * (AGENTS.md §5).
 */
const PAUSA_ENTRE_CLICS_MS = 500;

/** Esquinas del lote a dibujar, en píxeles desde el centro del mapa: un rectángulo de ~34 x 23 m. */
const ESQUINAS: [number, number][] = [
  [-60, 110],
  [60, 110],
  [60, 190],
  [-60, 190],
];

/** Hace clic en el polígono del lote (su etiqueta en el mapa) y espera el panel de ese lote. */
export async function seleccionarLote(page: Page, codigo: string): Promise<void> {
  await page.getByTestId(`poligono-${codigo}`).click();
  await expect(page.getByTestId('panel-lote')).toHaveAttribute('data-lote', codigo);
}

/**
 * Dibuja un rectángulo haciendo clic en sus 4 esquinas y lo cierra con «Terminar polígono».
 * Antes hay que pulsar `dibujar-lote` con un mapa ya cargado (con algún lote visible).
 */
export async function dibujarRectangulo(page: Page): Promise<void> {
  const caja = await page.getByTestId('mapa').boundingBox();
  if (!caja) throw new Error('El mapa no está visible.');
  const centroX = caja.x + caja.width / 2;
  const centroY = caja.y + caja.height / 2;
  for (const [indice, [dx, dy]] of ESQUINAS.entries()) {
    await page.waitForTimeout(PAUSA_ENTRE_CLICS_MS);
    await page.mouse.click(centroX + dx, centroY + dy);
    const vertices = indice + 1;
    await expect(page.getByTestId('dibujo-vertices')).toHaveText(`${vertices} ${vertices === 1 ? 'vértice' : 'vértices'}`);
  }
  await page.getByTestId('terminar-dibujo').click();
}
