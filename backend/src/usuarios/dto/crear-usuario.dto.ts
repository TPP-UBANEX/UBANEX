import {
  IsString, IsNotEmpty, IsEmail, IsArray, IsOptional, IsUUID, IsEnum,
  IsBoolean, IsInt, Min, Max,
} from 'class-validator';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';
import { Genero } from '../../common/enums/genero.enum';
import { CargoDocente } from '../../common/enums/cargo-docente.enum';
import { TipoDesignacionDocente } from '../../common/enums/tipo-designacion-docente.enum';

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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apellido?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEnum(Genero)
  genero?: Genero;

  @IsOptional()
  @IsBoolean()
  personaConDiscapacidad?: boolean;

  @IsOptional()
  @IsEnum(CargoDocente)
  cargoDocente?: CargoDocente;

  @IsOptional()
  @IsEnum(TipoDesignacionDocente)
  tipoDesignacionDocente?: TipoDesignacionDocente;

  @IsOptional()
  @IsString()
  areaDocente?: string;

  @IsOptional()
  @IsString()
  direccionLocalidad?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeCarrera?: number;

  @IsOptional()
  @IsUUID()
  carreraId?: string;
}
