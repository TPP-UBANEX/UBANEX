import { IsOptional, IsString } from 'class-validator';

export class ActualizarAvalDto {
  @IsOptional()
  @IsString()
  avalUrl?: string | null;
}
