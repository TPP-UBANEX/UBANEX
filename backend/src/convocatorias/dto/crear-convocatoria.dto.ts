import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearConvocatoriaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @Min(2020)
  @Type(() => Number)
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
  @Type(() => Number)
  cuotaFederativa?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  presupuestoTotal?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  topePresupuestoNoConsolidado?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  topePresupuestoConsolidado?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  porcentajeExtraInsumos?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  umbralInsumos?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  porcentajeExtraPse?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  umbralInconsistenciaCruzada?: number;
}
