import { sumar } from '../../dominio/dinero';
import { resumirPlan } from '../../dominio/planPagos';
import { resumirLotes } from '../../dominio/proyecto';
import type { Reloj, UnidadDeTrabajo } from '../puertos';

/** Reporte general para el administrador: lotes, ventas, cobros y saldos por proyecto. */
export class ReporteServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly reloj: Reloj,
  ) {}

  async resumenGeneral() {
    const hoy = this.reloj.hoy();
    const [proyectos, ventas, reservasActivas] = await Promise.all([
      this.uow.repos.proyectos.listar(false),
      this.uow.repos.ventas.listar({ estado: 'VIGENTE' }),
      this.uow.repos.reservas.listar({ estado: 'ACTIVA' }),
    ]);

    const filas = await Promise.all(
      proyectos.map(async (proyecto) => {
        const lotes = await this.uow.repos.lotes.listarPorProyecto(proyecto.id);
        const resumenLotes = resumirLotes(lotes);
        const ventasProyecto = ventas.filter((v) => v.lote.proyecto.id === proyecto.id);
        const planes = ventasProyecto.map((v) => resumirPlan(v.precioPactado, v.cuotas, v.pagos, hoy));
        return {
          proyecto: { id: proyecto.id, nombre: proyecto.nombre, estado: proyecto.estado },
          lotes: { total: resumenLotes.total, porEstado: resumenLotes.porEstado },
          reservasActivas: reservasActivas.filter((r) => r.lote.proyecto.id === proyecto.id).length,
          ventasVigentes: ventasProyecto.length,
          montoVendido: sumar(...ventasProyecto.map((v) => v.precioPactado)),
          totalCobrado: sumar(...planes.map((p) => p.totalPagado)),
          saldoPorCobrar: sumar(...planes.map((p) => p.saldoPendiente)),
          cuotasVencidas: planes.reduce((total, p) => total + p.cuotasVencidas, 0),
          montoVencido: sumar(...planes.map((p) => p.montoVencido)),
        };
      }),
    );

    return {
      generadoEn: this.reloj.ahora(),
      proyectos: filas,
      totales: {
        montoVendido: sumar(...filas.map((f) => f.montoVendido)),
        totalCobrado: sumar(...filas.map((f) => f.totalCobrado)),
        saldoPorCobrar: sumar(...filas.map((f) => f.saldoPorCobrar)),
        montoVencido: sumar(...filas.map((f) => f.montoVencido)),
      },
    };
  }
}
