import {
  IsString, IsOptional, IsObject, IsInt,
} from 'class-validator';

export class ActualizarEdicionDto {
  @IsOptional()
  @IsString()
  nombre?: string;

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
