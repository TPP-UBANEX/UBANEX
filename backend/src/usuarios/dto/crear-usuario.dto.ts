import {
  IsString, IsNotEmpty, IsEmail, IsArray, IsOptional, IsUUID, IsEnum,
} from 'class-validator';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';

export class CrearUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsArray()
  @IsEnum(RolUsuario, { each: true })
  roles: RolUsuario[];

  @IsOptional()
  @IsUUID()
  unidadAcademicaId?: string;
}
