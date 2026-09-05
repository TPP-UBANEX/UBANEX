import {
  IsOptional, IsEnum, IsNumber, IsPositive, IsString, MaxLength, IsDateString, IsNotEmpty,
} from 'class-validator';
import { TipoRubro } from '../../common/enums/tipo-rubro.enum';
import { EstadoComprobante } from '../../common/enums/estado-comprobante.enum';

export class ActualizarRendicionDto {
  @IsOptional()
  @IsEnum(TipoRubro)
  rubro?: TipoRubro;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  comprobanteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivoRechazo?: string;

  @IsOptional()
  @IsEnum(EstadoComprobante)
  estado?: EstadoComprobante;
}
