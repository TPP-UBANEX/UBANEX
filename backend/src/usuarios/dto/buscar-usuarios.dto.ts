import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { RolUsuario, ROLES_USUARIO_BUSCABLES } from '../../common/enums/rol-usuario.enum';

export class BuscarUsuariosDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** Acepta ?roles=Docente,Estudiante y ?roles=Docente&roles=Estudiante */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsIn(ROLES_USUARIO_BUSCABLES, { each: true })
  roles?: RolUsuario[];
}
