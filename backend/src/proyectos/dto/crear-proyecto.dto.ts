import {
  IsString, IsNotEmpty, IsUUID, IsOptional, IsInt, IsBoolean,
} from 'class-validator';

export class CrearProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsUUID()
  @IsNotEmpty()
  convocatoriaId: string;

  @IsOptional()
  @IsInt()
  anioEdicion?: number;

  @IsOptional()
  @IsBoolean()
  esConsolidado?: boolean;

  @IsOptional()
  @IsBoolean()
  esInterfacultad?: boolean;
}
