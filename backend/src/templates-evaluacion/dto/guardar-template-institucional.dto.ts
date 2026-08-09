import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { EstructuraTemplateInstitucional } from '../estructura-template';

export class GuardarTemplateInstitucionalDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsBoolean()
  @IsOptional()
  esDefault?: boolean;

  @IsOptional()
  estructura?: EstructuraTemplateInstitucional;
}
