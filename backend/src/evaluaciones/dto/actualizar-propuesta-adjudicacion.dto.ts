import { IsBoolean } from 'class-validator';

export class ActualizarPropuestaAdjudicacionDto {
  @IsBoolean()
  adjudicado: boolean;
}
