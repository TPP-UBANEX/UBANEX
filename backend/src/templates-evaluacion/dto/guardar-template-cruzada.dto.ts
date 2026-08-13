import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { EstructuraTemplateCruzada } from '../estructura-template';

export class GuardarTemplateCruzadaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsBoolean()
  @IsOptional()
  esDefault?: boolean;

  @IsOptional()
  estructura?: EstructuraTemplateCruzada;
}
