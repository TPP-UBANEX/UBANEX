import { IsOptional } from 'class-validator';
import {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
} from '../../templates-evaluacion/estructura-template';
import { EstructuraTemplateAutoevaluacion } from '../../ejecucion/estructura-autoevaluacion';

export class GuardarEstructuraInstitucionalDto {
  @IsOptional()
  estructura?: EstructuraTemplateInstitucional;
}

export class GuardarEstructuraCruzadaDto {
  @IsOptional()
  estructura?: EstructuraTemplateCruzada;
}

export class GuardarEstructuraAutoevaluacionDto {
  @IsOptional()
  estructura?: EstructuraTemplateAutoevaluacion;
}
