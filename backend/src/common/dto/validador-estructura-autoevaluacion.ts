import { BadRequestException } from '@nestjs/common';
import { EstructuraTemplateAutoevaluacion, PreguntaAutoevaluacion } from '../../ejecucion/estructura-autoevaluacion';
import { TipoPregunta } from '../enums/tipo-pregunta.enum';

function textoNoVacio(texto: string | undefined, contexto: string): void {
  if (!texto || !texto.trim()) {
    throw new BadRequestException(`Todas las preguntas de ${contexto} deben tener un texto`);
  }
}

function validarPregunta(p: PreguntaAutoevaluacion): void {
  textoNoVacio(p.texto, 'la autoevaluación de impacto');

  if (p.tipo === TipoPregunta.EscalaNumerica) {
    const min = Number(p.escalaMin);
    const max = Number(p.escalaMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new BadRequestException(`La pregunta "${p.texto}" de escala numérica debe tener mínimo y máximo`);
    }
    if (min > max) {
      throw new BadRequestException(`La pregunta "${p.texto}" tiene un mínimo mayor que su máximo`);
    }
  }

  if (p.tipo === TipoPregunta.Select || p.tipo === TipoPregunta.Checkbox) {
    if (!Array.isArray(p.opciones) || p.opciones.length === 0) {
      throw new BadRequestException(`La pregunta "${p.texto}" debe tener opciones predefinidas`);
    }
  }
}

export function validarEstructuraAutoevaluacion(
  estructura: EstructuraTemplateAutoevaluacion | undefined | null,
): void {
  if (estructura === undefined || estructura === null) return;
  if (!Array.isArray(estructura.preguntas)) {
    throw new BadRequestException('La estructura de la autoevaluación debe tener preguntas');
  }
  for (const pregunta of estructura.preguntas) {
    validarPregunta(pregunta);
  }
}