import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearUsuarioDto } from './crear-usuario.dto';

export class ActualizarUsuarioDto extends PartialType(
  OmitType(CrearUsuarioDto, ['password'] as const),
) {}
