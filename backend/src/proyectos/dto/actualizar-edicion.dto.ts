import {
  IsString, IsOptional, IsObject, IsInt, IsBoolean,
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
  @IsObject()
  presupuesto?: object;

  @IsOptional()
  @IsObject()
  datosFormulario?: object;
}
