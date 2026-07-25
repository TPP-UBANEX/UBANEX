import {
  IsString, IsNotEmpty, IsEmail, IsOptional, IsUUID, IsIn,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

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
}
