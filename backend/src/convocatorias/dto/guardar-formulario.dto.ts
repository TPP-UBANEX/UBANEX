import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CampoFormularioDto } from '../../common/dto/campo-formulario.dto';

export { CampoFormularioDto };

export class GuardarFormularioDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoFormularioDto)
  campos: CampoFormularioDto[];
}
