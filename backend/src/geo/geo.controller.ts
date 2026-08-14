import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeoService } from './geo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('geo')
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(private readonly service: GeoService) {}

  @Get('localidades')
  buscarLocalidades(@Query('q') q = '') {
    return this.service.buscarLocalidades(q);
  }
}
