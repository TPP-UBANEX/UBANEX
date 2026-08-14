import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { CampoFormularioDto } from '../../common/dto/campo-formulario.dto';

export class CrearPlantillaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsBoolean()
  esDefault?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoFormularioDto)
  campos?: CampoFormularioDto[];
}
