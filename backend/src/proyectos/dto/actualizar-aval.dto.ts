import { IsOptional, IsString, MaxLength } from 'class-validator';

export const AVAL_URL_MAX_LENGTH = 2048;

export class ActualizarAvalDto {
  @IsOptional()
  @IsString()
  @MaxLength(AVAL_URL_MAX_LENGTH)
  avalUrl?: string | null;
}
