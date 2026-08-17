import { IsUUID, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class ResubirProyectoDto {
  @IsUUID()
  @IsNotEmpty()
  convocatoriaId: string;

  @IsOptional()
  @IsInt()
  anioEdicion?: number;
}
