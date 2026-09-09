import { IsOptional, IsEnum, IsString, IsInt, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListarPaginadoDto } from '../../common/dto/listar-paginado.dto';
import { EstadoEdicion } from '../../common/enums/estado-edicion.enum';

export class ListarProyectosDto extends ListarPaginadoDto {
  @IsOptional()
  @IsString()
  convocatoriaId?: string;

  @IsOptional()
  @IsEnum(EstadoEdicion)
  estado?: EstadoEdicion;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  tieneAval?: boolean;
}
