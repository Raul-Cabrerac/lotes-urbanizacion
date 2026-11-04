import { aFechaISO, type FechaISO } from '../dominio/fechas';
import type { Reloj } from '../aplicacion/puertos';

/** Reloj real del sistema. */
export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }

  hoy(): FechaISO {
    return aFechaISO(new Date());
  }
}

/**
 * Reloj detenido en una fecha fija. Sirve para los datos de demostración
 * (operaciones "en el pasado") y para los tests (p. ej. vencimiento de reservas).
 */
export class RelojFijo implements Reloj {
  constructor(private fecha: Date) {}

  ahora(): Date {
    return new Date(this.fecha);
  }

  hoy(): FechaISO {
    return aFechaISO(this.fecha);
  }

  /** Mueve el reloj (útil en tests: "pasaron 10 días"). */
  avanzarDias(dias: number): void {
    this.fecha = new Date(this.fecha.getTime() + dias * 24 * 60 * 60 * 1000);
  }

  fijar(fecha: Date): void {
    this.fecha = new Date(fecha);
  }
}
