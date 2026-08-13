import { IsOptional } from 'class-validator';
import {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
} from '../../templates-evaluacion/estructura-template';

export class GuardarEstructuraInstitucionalDto {
  @IsOptional()
  estructura?: EstructuraTemplateInstitucional;
}

export class GuardarEstructuraCruzadaDto {
  @IsOptional()
  estructura?: EstructuraTemplateCruzada;
}
