import { Controller, Get, Param } from '@nestjs/common';
import { ConvocatoriasService } from './convocatorias.service';

@Controller('convocatorias')
export class ConvocatoriasController {
  constructor(private readonly service: ConvocatoriasService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
