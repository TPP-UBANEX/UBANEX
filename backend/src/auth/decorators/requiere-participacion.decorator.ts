import { SetMetadata } from '@nestjs/common';
import { RolEjecucion } from '../../common/enums/rol-ejecucion.enum';

export const REQUIERE_PARTICIPACION_KEY = 'requiere_participacion';
export const RequiereParticipacion = (...roles: RolEjecucion[]) =>
  SetMetadata(REQUIERE_PARTICIPACION_KEY, roles);
