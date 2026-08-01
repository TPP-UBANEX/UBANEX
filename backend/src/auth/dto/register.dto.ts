import {
  IsString, IsNotEmpty, IsEmail, IsOptional, IsUUID, IsIn, Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  apellido: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsIn(['estudiante', 'docente'])
  tipo: 'estudiante' | 'docente';

  @IsOptional()
  @IsUUID()
  unidadAcademicaId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9()\-\s]{6,20}$/, { message: 'El teléfono no tiene un formato válido' })
  telefono?: string;

  @IsOptional()
  @IsUUID()
  carreraId?: string;
}
