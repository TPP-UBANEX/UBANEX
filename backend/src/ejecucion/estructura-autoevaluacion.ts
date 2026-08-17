import { TipoPregunta } from '../common/enums/tipo-pregunta.enum';

// Estructura configurable del template de autoevaluación de impacto.
// `TemplateAutoevaluacionImpacto.estructura` persiste esta forma en una columna JSON.

export interface PreguntaAutoevaluacion {
  id: string;
  tipo: TipoPregunta;
  texto: string;
  esObligatorio: boolean;
  orden: number;
  opciones: string[] | null;
  escalaMin: number | null;
  escalaMax: number | null;
}

export interface EstructuraTemplateAutoevaluacion {
  preguntas: PreguntaAutoevaluacion[];
}