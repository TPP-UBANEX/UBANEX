import {
  IsString, IsNotEmpty, IsUUID, IsOptional, IsObject,
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
  @IsObject()
  presupuesto?: object;
}
