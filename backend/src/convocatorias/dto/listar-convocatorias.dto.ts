import { IsOptional, IsEnum, IsIn } from 'class-validator';
import { ListarPaginadoDto } from '../../common/dto/listar-paginado.dto';
import { EstadoConvocatoria } from '../../common/enums/estado-convocatoria.enum';

export class ListarConvocatoriasDto extends ListarPaginadoDto {
  @IsOptional()
  @IsEnum(EstadoConvocatoria)
  estado?: EstadoConvocatoria;

  @IsOptional()
  @IsIn(['activas', 'pasadas'])
  fase?: 'activas' | 'pasadas';
}
