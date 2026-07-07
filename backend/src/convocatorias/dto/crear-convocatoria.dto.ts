import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class CrearConvocatoriaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @Min(2020)
  anio: number;

  @IsDateString()
  @IsOptional()
  fechaInicioPresentacion?: string;

  @IsDateString()
  @IsOptional()
  fechaFinPresentacion?: string;

  @IsDateString()
  @IsOptional()
  fechaInicioEvaluacion?: string;

  @IsDateString()
  @IsOptional()
  fechaFinEvaluacion?: string;

  @IsDateString()
  @IsOptional()
  fechaInicioEjecucion?: string;

  @IsDateString()
  @IsOptional()
  fechaFinEjecucion?: string;

  @IsUUID()
  @IsOptional()
  formularioId?: string;
}
