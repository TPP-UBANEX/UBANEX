import {
  IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsNotEmpty,
  Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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
  TipoCampo.Tabla,
];

export const TIPOS_COLUMNA_TABLA = TIPOS_CAMPO_HABILITADOS
  .filter((t) => t !== TipoCampo.Seccion && t !== TipoCampo.Tabla);

export class ColumnaTablaDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(TIPOS_COLUMNA_TABLA)
  tipo: TipoCampo;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsBoolean()
  esObligatorio: boolean;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnaTablaDto)
  columnas?: ColumnaTablaDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  filasMinimas?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  filasMaximas?: number;
}
