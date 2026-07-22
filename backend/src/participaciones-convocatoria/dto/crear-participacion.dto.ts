import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { RolEjecucion } from '../../common/enums/rol-ejecucion.enum';

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
}
