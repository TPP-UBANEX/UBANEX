import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// Mismo límite que el aval por edición (ActualizarAvalDto).
export const RESOLUCION_URL_MAX_LENGTH = 2048;

export class MontoAdjudicadoInput {
  @IsUUID()
  edicionId: string;

  @IsNumber()
  @Min(0)
  monto: number;
}

export class GuardarAdjudicacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(RESOLUCION_URL_MAX_LENGTH)
  resolucionUrl?: string | null;

  @IsOptional()
  @IsDateString()
  fechaResolucion?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MontoAdjudicadoInput)
  montos?: MontoAdjudicadoInput[];
}

export class EmitirAdjudicacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(RESOLUCION_URL_MAX_LENGTH)
  resolucionUrl: string;

  @IsDateString()
  fechaResolucion: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MontoAdjudicadoInput)
  montos: MontoAdjudicadoInput[];
}
