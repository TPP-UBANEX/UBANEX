import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, IsUUID, ValidateNested } from 'class-validator';

export class ParEmparejamientoDto {
  @IsUUID()
  unidadAId: string;

  @IsUUID()
  unidadBId: string;
}

export class GuardarEmparejamientoDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ParEmparejamientoDto)
  pares: ParEmparejamientoDto[];
}
