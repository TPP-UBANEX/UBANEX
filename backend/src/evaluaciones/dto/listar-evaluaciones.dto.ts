import { IsOptional, IsString } from 'class-validator';
import { ListarPaginadoDto } from '../../common/dto/listar-paginado.dto';

export class ListarEvaluacionesDto extends ListarPaginadoDto {
  @IsOptional()
  @IsString()
  convocatoriaId?: string;
}
