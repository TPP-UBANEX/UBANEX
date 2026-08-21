import { BadRequestException } from '@nestjs/common';
import { EstructuraTemplateAutoevaluacion, PreguntaAutoevaluacion } from '../ejecucion/estructura-autoevaluacion';
import { TipoPregunta } from '../common/enums/tipo-pregunta.enum';

function validarPorTipo(pregunta: PreguntaAutoevaluacion, valor: unknown): void {
  switch (pregunta.tipo) {
    case TipoPregunta.Texto:
      if (valor !== null && typeof valor !== 'string') {
        throw new BadRequestException(`"${pregunta.texto}" debe responderse con texto`);
      }
      break;
    case TipoPregunta.Booleano:
      if (valor !== null && typeof valor !== 'boolean') {
        throw new BadRequestException(`"${pregunta.texto}" se responde con Sí o No`);
      }
      break;
    case TipoPregunta.EscalaNumerica:
      if (valor !== null) {
        if (typeof valor !== 'number' || !Number.isFinite(valor)) {
          throw new BadRequestException(`"${pregunta.texto}" debe tener un valor numérico`);
        }
        const min = Number(pregunta.escalaMin);
        const max = Number(pregunta.escalaMax);
        if (Number.isFinite(min) && Number.isFinite(max) && (valor < min || valor > max)) {
          throw new BadRequestException(
            `"${pregunta.texto}" debe estar entre ${min} y ${max}`,
          );
        }
      }
      break;
    case TipoPregunta.Select:
      if (valor !== null && (typeof valor !== 'string' || !(pregunta.opciones ?? []).includes(valor))) {
        throw new BadRequestException(`"${pregunta.texto}" debe elegir una de las opciones predefinidas`);
      }
      break;
    case TipoPregunta.Checkbox:
      if (valor !== null) {
        if (!Array.isArray(valor) || (valor as unknown[]).some(o => !(pregunta.opciones ?? []).includes(o as string))) {
          throw new BadRequestException(`"${pregunta.texto}" solo puede contener opciones predefinidas`);
        }
      }
      break;
    default:
      break;
  }
}

export function validarRespuestasAutoevaluacion(
  template: EstructuraTemplateAutoevaluacion | null | undefined,
  respuestas?: Record<string, unknown> | null,
): void {
  if (!respuestas) return;

  const preguntasPorId = new Map<string, PreguntaAutoevaluacion>(
    (template?.preguntas ?? []).map(p => [p.id, p]),
  );

  for (const [id, valor] of Object.entries(respuestas)) {
    const pregunta = preguntasPorId.get(id);
    if (!pregunta) {
      throw new BadRequestException(`La pregunta ${id} no pertenece al formulario de autoevaluación`);
    }
    validarPorTipo(pregunta, valor);
  }
}

/** Lista los textos de las preguntas obligatorias sin responder (para el sello de "Completada"). */
export function preguntasObligatoriasFaltantes(
  template: EstructuraTemplateAutoevaluacion | null | undefined,
  respuestas?: Record<string, unknown> | null,
): string[] {
  const faltantes: string[] = [];
  for (const pregunta of template?.preguntas ?? []) {
    if (!pregunta.esObligatorio) continue;
    const valor = respuestas?.[pregunta.id];
    const vacio =
      valor === undefined ||
      valor === null ||
      valor === '' ||
      (Array.isArray(valor) && valor.length === 0);
    if (vacio) faltantes.push(pregunta.texto);
  }
  return faltantes;
}