import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GuardarEvaluacionInstitucionalDto {
  @IsOptional()
  categorias?: Record<string, unknown>;

  @IsOptional()
  checklist?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  observaciones?: string;
}
