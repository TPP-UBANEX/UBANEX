import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { TipoPersona } from '../common/enums/tipo-persona.enum';

export interface ViaticoPresupuesto {
  tipoPersona: TipoPersona;
  descripcion: string;
  /** Texto libre: el docente describe el período (ej. "2do cuatrimestre 2026"), no fechas. */
  periodo: string;
  monto: number;
}

export interface BienPresupuesto {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  monto: number;
  /** Si el docente/creador considera que esta partida es un insumo (ver presupuesto.util.ts#calcularPresupuestoAAdjudicar). */
  esInsumo?: boolean;
}

export interface RubroPresupuesto {
  tipo: TipoRubro;
  subtotal: number;
  partidas: ViaticoPresupuesto[] | BienPresupuesto[];
}

export interface Presupuesto {
  montoTotal: number;
  rubros: RubroPresupuesto[];
}
