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

  // Un proyecto nuevo nunca nace consolidado: el estado se deriva del historial.
  @IsOptional()
  @IsBoolean()
  esInterfacultad?: boolean;
}
