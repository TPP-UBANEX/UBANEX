import {
  IsString, IsNotEmpty, IsUUID, IsOptional, IsObject,
} from 'class-validator';

export class CrearProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsUUID()
  @IsNotEmpty()
  convocatoriaId: string;

  @IsOptional()
  @IsUUID()
  codirectorId?: string;

  @IsOptional()
  @IsObject()
  presupuesto?: object;
}
