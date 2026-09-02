import {
  IsString, IsNotEmpty, IsOptional, MaxLength, IsIn, IsDateString, IsArray, ArrayMaxSize,
} from 'class-validator';
import { CategoriaHito } from '../../common/enums/categoria-hito.enum';

const CATEGORIAS_VALIDAS = Object.values(CategoriaHito);

export const HITO_LINKS_MAX = 20;
export const HITO_LINK_MAX_LENGTH = 2048;

export class CrearHitoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  integrantes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(HITO_LINKS_MAX)
  @IsString({ each: true })
  @MaxLength(HITO_LINK_MAX_LENGTH, { each: true })
  links?: string[];

  @IsIn(CATEGORIAS_VALIDAS)
  categoria: CategoriaHito;
}

export class ActualizarHitoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  integrantes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(HITO_LINKS_MAX)
  @IsString({ each: true })
  @MaxLength(HITO_LINK_MAX_LENGTH, { each: true })
  links?: string[];

  @IsOptional()
  @IsIn(CATEGORIAS_VALIDAS)
  categoria?: CategoriaHito;
}