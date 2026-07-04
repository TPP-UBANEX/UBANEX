import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CrearUsuarioDto } from './crear-usuario.dto';

export class ActualizarUsuarioDto extends PartialType(CrearUsuarioDto) {
  @IsOptional()
  @IsBoolean()
  habilitado?: boolean;
}
