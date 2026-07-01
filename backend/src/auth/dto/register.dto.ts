import {
  IsString, IsNotEmpty, IsEmail, IsOptional, IsUUID,
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

  @IsOptional()
  @IsUUID()
  unidadAcademicaId?: string;
}
