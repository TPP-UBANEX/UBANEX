import { IsOptional, IsString, IsObject } from 'class-validator';

export class GuardarEvaluacionCruzadaDto {
  @IsOptional()
  @IsObject()
  items?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
