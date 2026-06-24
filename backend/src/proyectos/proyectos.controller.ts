import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';

@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly service: ProyectosService) {}

  @Get()
  findAll(@Query('convocatoriaId') convocatoriaId?: string) {
    return this.service.findAll(convocatoriaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
