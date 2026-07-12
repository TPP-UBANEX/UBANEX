import {
  IsString, IsOptional, IsUUID, IsObject, IsInt,
} from 'class-validator';

export class ActualizarEdicionDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsUUID()
  codirectorId?: string;

  @IsOptional()
  @IsInt()
  anioEdicion?: number;

  @IsOptional()
  @IsObject()
  presupuesto?: object;

  @IsOptional()
  @IsObject()
  datosFormulario?: object;
}
