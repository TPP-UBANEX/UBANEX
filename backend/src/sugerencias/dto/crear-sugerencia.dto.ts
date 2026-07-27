import { IsString, IsNotEmpty } from 'class-validator';

export class CrearSugerenciaDto {
  @IsString()
  @IsNotEmpty()
  campo: string;

  @IsString()
  @IsNotEmpty()
  valorSugerido: string;

  @IsString()
  @IsNotEmpty()
  comentario: string;
}
