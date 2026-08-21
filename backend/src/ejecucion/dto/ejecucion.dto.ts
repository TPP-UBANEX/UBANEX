import { IsOptional } from 'class-validator';

export class GuardarAutoevaluacionDto {
  @IsOptional()
  respuestas?: Record<string, unknown>;
}

export class GuardarInformeFinalDto {
  @IsOptional()
  contenido?: string;

  @IsOptional()
  archivoAdjuntoUrl?: string;
}