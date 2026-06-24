import { Controller, Get, Query } from '@nestjs/common';
import { RendicionesService } from './rendiciones.service';

@Controller('rendiciones')
export class RendicionesController {
  constructor(private readonly service: RendicionesService) {}

  @Get()
  findAll(@Query('proyectoId') proyectoId?: string) {
    return this.service.findAll(proyectoId);
  }
}
