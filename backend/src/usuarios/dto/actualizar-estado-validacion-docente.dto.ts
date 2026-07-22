import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoValidacionDocente } from '../../common/enums/estado-validacion-docente.enum';

export class ActualizarEstadoValidacionDocenteDto {
  @IsEnum(EstadoValidacionDocente)
  @IsNotEmpty()
  estadoValidacionDocente: EstadoValidacionDocente;
}
