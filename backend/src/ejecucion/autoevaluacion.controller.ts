import {
  Controller, Get, Put, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { EjecucionService } from './ejecucion.service';
import { GuardarAutoevaluacionDto } from './dto/ejecucion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('autoevaluacion-impacto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutoevaluacionController {
  constructor(private readonly service: EjecucionService) {}

  @Get('ediciones/:edicionId')
  obtener(@Param('edicionId') edicionId: string, @CurrentUser() usuario: Usuario) {
    return this.service.obtenerAutoevaluacion(edicionId, usuario);
  }

  @Put('ediciones/:edicionId')
  guardar(
    @Param('edicionId') edicionId: string,
    @Body() dto: GuardarAutoevaluacionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.guardarAutoevaluacion(edicionId, dto, usuario);
  }

  @Post('ediciones/:edicionId/completar')
  completar(@Param('edicionId') edicionId: string, @CurrentUser() usuario: Usuario) {
    return this.service.completarAutoevaluacion(edicionId, usuario);
  }
}