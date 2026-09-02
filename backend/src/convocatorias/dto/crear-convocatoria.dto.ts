import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, IsNumber, Min, Max } from 'class-validator';

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

  @IsInt()
  @Min(0)
  @IsOptional()
  cuotaFederativa?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  presupuestoTotal?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  topePresupuestoNoConsolidado?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  topePresupuestoConsolidado?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentajeExtraInsumos?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  umbralInsumos?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentajeExtraPse?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  umbralInconsistenciaCruzada?: number;
}
