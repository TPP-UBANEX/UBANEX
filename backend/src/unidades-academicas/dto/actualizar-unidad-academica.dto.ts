import { PartialType } from '@nestjs/mapped-types';
import { CrearUnidadAcademicaDto } from './crear-unidad-academica.dto';

export class ActualizarUnidadAcademicaDto extends PartialType(CrearUnidadAcademicaDto) {}
