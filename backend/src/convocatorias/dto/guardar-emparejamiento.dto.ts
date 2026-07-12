import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class ParEmparejamientoDto {
  @IsUUID()
  unidadAId: string;

  @IsUUID()
  unidadBId: string;
}

export class GuardarEmparejamientoDto {
  @IsArray()
  @ArrayNotEmpty()
  pares: ParEmparejamientoDto[];
}
