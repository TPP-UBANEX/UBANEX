import { PartialType } from '@nestjs/mapped-types';
import { CrearPlantillaDto } from './crear-plantilla.dto';

export class ActualizarPlantillaDto extends PartialType(CrearPlantillaDto) {}
