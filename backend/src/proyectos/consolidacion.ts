import { EstadoEdicion } from '../common/enums/estado-edicion.enum';

/**
 * Lógica de consolidación de proyectos (derivada del historial de adjudicaciones).
 *
 * Un proyecto se consolida al adjudicarse en 3 convocatorias consecutivas: en la
 * 4ta participación queda consolidado pero igual se evalúa, y desde la 5ta alterna
 * (saltea evaluación, evalúa, saltea, …).
 *
 * Con `A` = cantidad de convocatorias inmediatamente anteriores (sin huecos) en las
 * que el proyecto quedó `Adjudicado`:
 *   - esConsolidadoDerivado = A >= 3   (la actual es la 4ta consecutiva)
 *   - salteaEvaluacion      = A >= 4 && A par   (A=4→5ta saltea, A=5→6ta evalúa, …)
 *
 * "Aprobado" = `Edicion.estado === Adjudicado`. Un hueco (no participó o no adjudicado)
 * reinicia la racha.
 */

export interface ConvocatoriaOrden {
  id: string;
  anio: number | null;
  creadoEn: Date;
}

export interface EdicionHistorial {
  convocatoriaId: string;
  estado: EstadoEdicion;
}

export interface DatosConsolidacion {
  rachaAdjudicaciones: number;
  esConsolidadoDerivado: boolean;
  salteaEvaluacion: boolean;
}

/** Ordena las convocatorias cronológicamente (año, y creación como desempate). */
export function ordenarConvocatorias(convocatorias: ConvocatoriaOrden[]): ConvocatoriaOrden[] {
  return [...convocatorias].sort((a, b) => {
    const anioA = a.anio ?? 0;
    const anioB = b.anio ?? 0;
    if (anioA !== anioB) return anioA - anioB;
    return new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime();
  });
}

/**
 * Calcula la racha y los flags derivados para la participación del proyecto en
 * `convocatoriaActualId`. `convocatoriasOrdenadas` deben venir en orden cronológico
 * ascendente (usar `ordenarConvocatorias`).
 */
export function calcularConsolidacion(
  convocatoriasOrdenadas: ConvocatoriaOrden[],
  edicionesDelProyecto: EdicionHistorial[],
  convocatoriaActualId: string,
): DatosConsolidacion {
  const estadoPorConvocatoria = new Map<string, EstadoEdicion>();
  for (const e of edicionesDelProyecto) {
    estadoPorConvocatoria.set(e.convocatoriaId, e.estado);
  }

  const idxActual = convocatoriasOrdenadas.findIndex(c => c.id === convocatoriaActualId);
  let racha = 0;
  for (let i = idxActual - 1; i >= 0; i--) {
    const conv = convocatoriasOrdenadas[i];
    if (estadoPorConvocatoria.get(conv.id) === EstadoEdicion.Adjudicado) {
      racha += 1;
    } else {
      break;
    }
  }

  return {
    rachaAdjudicaciones: racha,
    esConsolidadoDerivado: racha >= 3,
    salteaEvaluacion: racha >= 4 && racha % 2 === 0,
  };
}

/** Estado consolidado efectivo: el override manual gana; si es null, se deriva. */
export function esConsolidadoEfectivo(
  datos: DatosConsolidacion,
  overrideManual: boolean | null,
): boolean {
  return overrideManual ?? datos.esConsolidadoDerivado;
}

/**
 * ¿Esta edición saltea la etapa de evaluación? Solo por racha derivada, y nunca si
 * Rectorado forzó el proyecto como no consolidado (`override === false`).
 */
export function salteaEvaluacionEfectivo(
  datos: DatosConsolidacion,
  overrideManual: boolean | null,
): boolean {
  return datos.salteaEvaluacion && overrideManual !== false;
}
