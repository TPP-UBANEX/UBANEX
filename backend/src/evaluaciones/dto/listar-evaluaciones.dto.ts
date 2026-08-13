import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ListarPaginadoDto } from '../../common/dto/listar-paginado.dto';

export class ListarEvaluacionesDto extends ListarPaginadoDto {
  @IsOptional()
  @IsString()
  convocatoriaId?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsUUID()
  unidadAcademicaId?: string;
}