import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsNotEmpty, ValidateNested,
} from 'class-validator';
import { TipoCampo } from '../../common/enums/tipo-campo.enum';

const TIPOS_CAMPO_HABILITADOS = [
  TipoCampo.Texto,
  TipoCampo.TextoLargo,
  TipoCampo.Fecha,
  TipoCampo.Geolocalizacion,
  TipoCampo.Booleano,
  TipoCampo.Checkbox,
  TipoCampo.Select,
];

export class CampoFormularioDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(TIPOS_CAMPO_HABILITADOS)
  tipo: TipoCampo;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  textoAyuda?: string;

  @IsBoolean()
  esObligatorio: boolean;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opciones?: string[];
}

export class GuardarFormularioDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoFormularioDto)
  campos: CampoFormularioDto[];
}
