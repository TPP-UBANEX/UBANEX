import { IsString, IsOptional, IsDateString, IsEnum, IsInt, IsNumber, Min } from 'class-validator';
import { EstadoConvocatoria } from '../../common/enums/estado-convocatoria.enum';

export class ActualizarConvocatoriaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @Min(2020)
  @IsOptional()
  anio?: number;

  @IsEnum(EstadoConvocatoria)
  @IsOptional()
  estado?: EstadoConvocatoria;

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
  cupoMinimoPorUnidadAcademica?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  presupuestoTotal?: number;
}
