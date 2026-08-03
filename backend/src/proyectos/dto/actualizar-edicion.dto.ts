import {
  IsString, IsOptional, IsObject, IsInt, IsBoolean, IsUUID,
} from 'class-validator';

export class ActualizarEdicionDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsInt()
  anioEdicion?: number;

  @IsOptional()
  @IsBoolean()
  esConsolidado?: boolean;

  @IsOptional()
  @IsBoolean()
  esInterfacultad?: boolean;

  @IsOptional()
  @IsUUID()
  unidadAcademicaAdicionalId?: string;

  @IsOptional()
  @IsObject()
  presupuesto?: object;

  @IsOptional()
  @IsObject()
  datosFormulario?: object;
}
