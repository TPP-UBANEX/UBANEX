import { IsOptional, IsString } from 'class-validator';

export class GuardarEvaluacionInstitucionalDto {
  @IsOptional()
  categorias?: Record<string, unknown>;

  @IsOptional()
  checklist?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
