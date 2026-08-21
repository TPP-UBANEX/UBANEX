import {
  Controller, Get, Put, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { EjecucionService } from './ejecucion.service';
import { GuardarInformeFinalDto } from './dto/ejecucion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('informe-final')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InformeFinalController {
  constructor(private readonly service: EjecucionService) {}

  @Get('ediciones/:edicionId')
  obtener(@Param('edicionId') edicionId: string, @CurrentUser() usuario: Usuario) {
    return this.service.obtenerInforme(edicionId, usuario);
  }

  @Put('ediciones/:edicionId')
  guardar(
    @Param('edicionId') edicionId: string,
    @Body() dto: GuardarInformeFinalDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.guardarInforme(edicionId, dto, usuario);
  }

  @Post('ediciones/:edicionId/confirmar')
  confirmar(@Param('edicionId') edicionId: string, @CurrentUser() usuario: Usuario) {
    return this.service.confirmarInforme(edicionId, usuario);
  }
}