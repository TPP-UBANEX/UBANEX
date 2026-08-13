import { IsNotEmpty, IsString } from 'class-validator';

export class DesignarTerceraEvaluadorDto {
  @IsString()
  @IsNotEmpty()
  evaluadorId: string;
}
