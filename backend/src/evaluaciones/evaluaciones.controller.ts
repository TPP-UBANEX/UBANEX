import { Controller, Get, Query } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';

@Controller('evaluaciones')
export class EvaluacionesController {
  constructor(private readonly service: EvaluacionesService) {}

  @Get()
  findAll(@Query('proyectoId') proyectoId?: string) {
    return this.service.findAll(proyectoId);
  }
}
