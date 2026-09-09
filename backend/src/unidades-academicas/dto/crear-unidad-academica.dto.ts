import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CrearUnidadAcademicaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  /** Dominio del correo institucional sin arroba (ej. `fi.uba.ar`). */
  @IsOptional()
  @Matches(/^[a-z0-9.-]+\.[a-z]{2,}$/i, {
    message: 'dominioEmail debe ser un dominio válido, sin arroba (ej. fi.uba.ar)',
  })
  dominioEmail?: string;
}
