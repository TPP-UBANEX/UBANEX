import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoDirector } from '../../common/enums/estado-director.enum';

export class ActualizarEstadoDirectorDto {
  @IsEnum(EstadoDirector)
  @IsNotEmpty()
  estadoDirector: EstadoDirector;
}
