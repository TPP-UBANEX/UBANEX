import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoPropuestaEvaluador } from '../../common/enums/estado-propuesta-evaluador.enum';

export class ActualizarEstadoParticipacionDto {
  @IsEnum(EstadoPropuestaEvaluador)
  @IsNotEmpty()
  estado: EstadoPropuestaEvaluador.Aprobado | EstadoPropuestaEvaluador.Rechazado;
}
