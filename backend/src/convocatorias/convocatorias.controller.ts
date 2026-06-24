import { Controller, Get } from '@nestjs/common';
import { ConvocatoriasService } from './convocatorias.service';

@Controller('convocatorias')
export class ConvocatoriasController {
  constructor(private readonly service: ConvocatoriasService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
