import { IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsEnum, IsString } from 'class-validator';
import { RolEjecucion } from '../../common/enums/rol-ejecucion.enum';
import { Genero } from '../../common/enums/genero.enum';
import { CargoDocente } from '../../common/enums/cargo-docente.enum';
import { TipoDesignacionDocente } from '../../common/enums/tipo-designacion-docente.enum';

export class CrearParticipacionDto {
  @IsUUID()
  @IsNotEmpty()
  usuarioId: string;

  @IsUUID()
  @IsNotEmpty()
  convocatoriaId: string;

  @IsEnum(RolEjecucion)
  @IsNotEmpty()
  rol: RolEjecucion;

  @IsOptional()
  @IsUUID()
  edicionId?: string;

  @IsOptional()
  @IsBoolean()
  esDirectorPrincipal?: boolean;

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
}
