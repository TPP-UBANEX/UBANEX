import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CrearSugerenciaDto {
  @IsString()
  @IsNotEmpty()
  campo: string;

  @IsOptional()
  @IsString()
  valorSugerido?: string;

  @IsString()
  @IsNotEmpty()
  comentario: string;
}
