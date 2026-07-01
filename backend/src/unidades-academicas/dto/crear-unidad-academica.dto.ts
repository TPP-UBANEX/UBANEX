import { IsString, IsNotEmpty } from 'class-validator';

export class CrearUnidadAcademicaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
