import {
  IsString, IsNotEmpty, IsEmail, IsOptional, IsUUID, IsIn,
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
  telefono?: string;

  @IsOptional()
  @IsUUID()
  carreraId?: string;
}
