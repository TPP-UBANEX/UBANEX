import { IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { MecanismoAdjudicacion } from '../../common/enums/mecanismo-adjudicacion.enum';

export class ActualizarPropuestaAdjudicacionDto {
  @IsBoolean()
  adjudicado: boolean;

  @IsOptional()
  @IsEnum(MecanismoAdjudicacion)
  mecanismo?: MecanismoAdjudicacion;
}
