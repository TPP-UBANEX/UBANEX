import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CrearCarreraDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsUUID()
  unidadAcademicaId: string;
}
