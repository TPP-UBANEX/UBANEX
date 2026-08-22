import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn, IsDateString } from 'class-validator';
import { CategoriaHito } from '../../common/enums/categoria-hito.enum';

const CATEGORIAS_VALIDAS = Object.values(CategoriaHito);

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
  @IsIn(CATEGORIAS_VALIDAS)
  categoria?: CategoriaHito;
}