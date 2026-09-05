import {
  IsUUID, IsEnum, IsNumber, IsPositive, IsOptional, IsString,
  MaxLength, IsDateString, IsNotEmpty,
} from 'class-validator';
import { TipoRubro } from '../../common/enums/tipo-rubro.enum';

export class CrearRendicionDto {
  @IsUUID()
  edicionId: string;

  @IsEnum(TipoRubro)
  rubro: TipoRubro;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  comprobanteUrl: string;
}
