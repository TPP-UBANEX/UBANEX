import { IsBoolean } from 'class-validator';

export class ActualizarVisibilidadComprobantesDto {
  @IsBoolean()
  uaPuedeVerComprobantes: boolean;
}