import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { EstadoSugerencia } from '../../common/enums/estado-sugerencia.enum';

export class ResponderSugerenciaDto {
  @IsString()
  @IsNotEmpty()
  estado: EstadoSugerencia;

  @IsOptional()
  @IsString()
  respuestaDirector?: string;
}
