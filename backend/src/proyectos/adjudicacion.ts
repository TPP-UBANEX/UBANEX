import { Edicion } from './edicion.entity';

/**
 * El aval (link al PDF firmado por el decano) es requisito para adjudicar una
 * edición. No bloquea el pase a evaluación: puede cargarse mientras la edición
 * está en Presentado o EnEvaluacion, y recién condiciona la adjudicación.
 *
 * Todavía no hay un flujo de adjudicación formal que lo invoque; queda listo
 * para cuando se construya el orden de mérito / la resolución de adjudicación.
 */
export function puedeAdjudicarse(edicion: Pick<Edicion, 'avalUrl'>): boolean {
  return !!edicion.avalUrl;
}
