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
 *
 * `fueConsolidadoAlgunaVez` es irreversible: una vez que en alguna convocatoria (hasta la actual
 * inclusive) el proyecto llegó con racha >= 3, queda marcado para siempre, aunque después haya
 * huecos que reinicien la racha. Se usa para el tope de presupuesto solicitado (ver
 * presupuesto.util.ts#topePresupuestoSolicitado y esConsolidadoParaTope más abajo), no para
 * esConsolidadoDerivado ni salteaEvaluacion, que siguen siendo por racha vigente.
 */

export interface ConvocatoriaOrden {
  id: string;
  anio: number | null;
}

export interface EdicionHistorial {
  convocatoriaId: string;
  estado: EstadoEdicion;
}

export interface DatosConsolidacion {
  rachaAdjudicaciones: number;
  esConsolidadoDerivado: boolean;
  salteaEvaluacion: boolean;
  fueConsolidadoAlgunaVez: boolean;
}

/** Ordena las convocatorias por año, con el id como desempate estable. */
export function ordenarConvocatorias(convocatorias: ConvocatoriaOrden[]): ConvocatoriaOrden[] {
  return [...convocatorias].sort((a, b) => {
    const anioA = a.anio ?? 0;
    const anioB = b.anio ?? 0;
    if (anioA !== anioB) return anioA - anioB;
    return a.id.localeCompare(b.id);
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

  // Recorrido hacia atrás para la racha de la convocatoria actual (comportamiento sin cambios).
  let racha = 0;
  for (let i = idxActual - 1; i >= 0; i--) {
    const conv = convocatoriasOrdenadas[i];
    if (estadoPorConvocatoria.get(conv.id) === EstadoEdicion.Adjudicado) {
      racha += 1;
    } else {
      break;
    }
  }

  // Recorrido hacia adelante (0..idxActual) para detectar si el proyecto llegó a consolidarse
  // alguna vez hasta la convocatoria actual inclusive: existe una convocatoria en la que el
  // proyecto tiene edición y llegaba con una racha >= 3 de adjudicaciones consecutivas.
  let rachaAcumulada = 0;
  let fueConsolidadoAlgunaVez = false;
  for (let i = 0; i <= idxActual; i++) {
    const conv = convocatoriasOrdenadas[i];
    const estado = estadoPorConvocatoria.get(conv.id);
    if (estado !== undefined && rachaAcumulada >= 3) fueConsolidadoAlgunaVez = true;
    rachaAcumulada = estado === EstadoEdicion.Adjudicado ? rachaAcumulada + 1 : 0;
  }

  return {
    rachaAdjudicaciones: racha,
    esConsolidadoDerivado: racha >= 3,
    salteaEvaluacion: racha >= 4 && racha % 2 === 0,
    fueConsolidadoAlgunaVez,
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

/**
 * Consolidación a efectos del tope de presupuesto solicitado (ver presupuesto.util.ts): es
 * irreversible. Una vez que el proyecto se consolidó alguna vez, le corresponde el tope de
 * consolidado para siempre, aunque en la convocatoria actual le toque volver a evaluación. El
 * override manual solo puede subir a un proyecto al tope de consolidado (`true`); un `false`
 * nunca lo baja, a diferencia de `esConsolidadoEfectivo`.
 */
export function esConsolidadoParaTope(
  datos: DatosConsolidacion,
  overrideManual: boolean | null,
): boolean {
  return overrideManual === true || datos.fueConsolidadoAlgunaVez;
}
