import * as crypto from 'crypto';
import { CampoFormulario, ColumnaTabla } from '../formularios/campo-formulario.interface';
import { BienPresupuesto, Presupuesto, ViaticoPresupuesto } from '../proyectos/presupuesto.interface';
import { normalizarPresupuesto } from '../proyectos/presupuesto.util';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { TipoPersona } from '../common/enums/tipo-persona.enum';

/**
 * Copia los campos de una plantilla a una convocatoria regenerando los ids de
 * cada campo y columna (igual que hace la UI al elegir una plantilla): así las
 * respuestas de una convocatoria nunca se confunden con las de otra que partió
 * de la misma plantilla.
 */
export function clonarCamposConIdsNuevos(campos: CampoFormulario[]): CampoFormulario[] {
  const clonarColumna = (columna: ColumnaTabla): ColumnaTabla => ({ ...columna, id: crypto.randomUUID() });
  return campos.map((campo) => ({
    ...campo,
    id: crypto.randomUUID(),
    columnas: campo.columnas?.map(clonarColumna),
  }));
}

/**
 * Arma un presupuesto a partir de montos fijos (elegidos a mano por el llamador, no
 * generados al azar) y deja que normalizarPresupuesto derive el monto de los bienes,
 * los subtotales y el total: un presupuesto de seed nunca puede quedar con sumas que no
 * cierran, porque pasa por el mismo cálculo que usa la API.
 */
export function crearPresupuesto(opts: {
  periodoInicio: string;
  periodoFin: string;
  viaticoDocente: number;
  viaticoEstudiante: number;
  consumoCantidad: number;
  consumoPrecioUnitario: number;
  consumoEsInsumo?: boolean;
  usoCantidad: number;
  usoPrecioUnitario: number;
}): Presupuesto {
  const viaticos: ViaticoPresupuesto[] = [
    {
      tipoPersona: TipoPersona.Docente,
      descripcion: 'Viáticos para docentes',
      periodoInicio: opts.periodoInicio,
      periodoFin: opts.periodoFin,
      monto: opts.viaticoDocente,
    },
    {
      tipoPersona: TipoPersona.Estudiante,
      descripcion: 'Viáticos para estudiantes',
      periodoInicio: opts.periodoInicio,
      periodoFin: opts.periodoFin,
      monto: opts.viaticoEstudiante,
    },
  ];
  const consumo: BienPresupuesto[] = [
    {
      descripcion: 'Materiales e insumos',
      cantidad: opts.consumoCantidad,
      precioUnitario: opts.consumoPrecioUnitario,
      monto: 0,
      esInsumo: opts.consumoEsInsumo ?? true,
    },
  ];
  const uso: BienPresupuesto[] = [
    {
      descripcion: 'Equipamiento',
      cantidad: opts.usoCantidad,
      precioUnitario: opts.usoPrecioUnitario,
      monto: 0,
      esInsumo: false,
    },
  ];

  const crudo: Presupuesto = {
    montoTotal: 0,
    rubros: [
      { tipo: TipoRubro.ViaticosYSeguros, subtotal: 0, partidas: viaticos },
      { tipo: TipoRubro.BienesDeConsumo, subtotal: 0, partidas: consumo },
      { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: uso },
    ],
  };
  return normalizarPresupuesto(crudo);
}

export function slugUa(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}
