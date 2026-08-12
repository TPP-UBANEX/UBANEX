import {
  IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsNotEmpty,
} from 'class-validator';
import { TipoCampo } from '../enums/tipo-campo.enum';

export const TIPOS_CAMPO_HABILITADOS = [
  TipoCampo.Texto,
  TipoCampo.TextoLargo,
  TipoCampo.Numero,
  TipoCampo.Fecha,
  TipoCampo.Geolocalizacion,
  TipoCampo.Booleano,
  TipoCampo.Checkbox,
  TipoCampo.Select,
  TipoCampo.Seccion,
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

  @IsOptional()
  @IsNumber()
  minimo?: number;

  @IsOptional()
  @IsNumber()
  maximo?: number;

  @IsOptional()
  @IsBoolean()
  admiteDecimales?: boolean;
}
