import {
  IsString, IsNotEmpty, IsUUID, IsOptional, IsObject, IsInt,
} from 'class-validator';

export class CrearProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsUUID()
  convocatoriaId?: string;

  @IsOptional()
  @IsUUID()
  codirectorId?: string;

  @IsOptional()
  @IsInt()
  anioEdicion?: number;

  @IsOptional()
  @IsObject()
  presupuesto?: object;
}
