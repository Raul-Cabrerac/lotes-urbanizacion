/** Valores de los campos de formulario: lo que se escribe en un input y lo que se le propone. */

/** Convierte el texto de un input numérico: '' -> undefined. */
export function numeroOIndefinido(texto: string): number | undefined {
  if (texto.trim() === '') return undefined;
  const numero = Number(texto.replace(',', '.'));
  return Number.isFinite(numero) ? numero : NaN;
}

/** Fecha de hoy + n días en formato 'AAAA-MM-DD' (para inputs de tipo date). */
export function fechaEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
