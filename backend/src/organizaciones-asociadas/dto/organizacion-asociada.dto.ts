import {
  IsString, IsNotEmpty, IsOptional, MaxLength, IsDateString, IsEmail,
} from 'class-validator';

export class CrearOrganizacionAsociadaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  personeriaJuridica?: string;

  @IsOptional()
  @IsDateString()
  fechaInicioActividades?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsableNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsableCargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  localidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigoPostal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  departamentoPartido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  telefonos?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  web?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objetivos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  actividades?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  otraInfo?: string;
}

export class ActualizarOrganizacionAsociadaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  personeriaJuridica?: string;

  @IsOptional()
  @IsDateString()
  fechaInicioActividades?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsableNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsableCargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  localidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigoPostal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  departamentoPartido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  telefonos?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  web?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objetivos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  actividades?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  otraInfo?: string;
}
