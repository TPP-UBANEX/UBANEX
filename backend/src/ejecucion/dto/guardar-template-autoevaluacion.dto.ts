import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { EstructuraTemplateAutoevaluacion } from '../estructura-autoevaluacion';

export class GuardarTemplateAutoevaluacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsBoolean()
  @IsOptional()
  esDefault?: boolean;

  @IsOptional()
  estructura?: EstructuraTemplateAutoevaluacion;
}