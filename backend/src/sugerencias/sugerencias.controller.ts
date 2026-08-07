import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { SugerenciasService } from './sugerencias.service';
import { CrearSugerenciaDto } from './dto/crear-sugerencia.dto';
import { ResponderSugerenciaDto } from './dto/responder-sugerencia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class SugerenciasController {
  constructor(private readonly service: SugerenciasService) {}

  @Post('ediciones/:edicionId/sugerencias')
  crear(
    @Param('edicionId') edicionId: string,
    @Body() dto: CrearSugerenciaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.crear(edicionId, dto, usuario);
  }

  @Get('ediciones/:edicionId/sugerencias')
  listar(
    @Param('edicionId') edicionId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.listar(edicionId, usuario);
  }

  @Patch('sugerencias/:id/responder')
  responder(
    @Param('id') id: string,
    @Body() dto: ResponderSugerenciaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.responder(id, dto, usuario);
  }

  @Get('notificaciones')
  listarNotificaciones(@CurrentUser() usuario: Usuario) {
    return this.service.listarNotificaciones(usuario);
  }

  @Patch('notificaciones/:id/leer')
  marcarLeida(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.marcarLeida(id, usuario);
  }

  @Patch('notificaciones/leer-todas')
  marcarTodasLeidas(@CurrentUser() usuario: Usuario) {
    return this.service.marcarTodasLeidas(usuario);
  }

  @Delete('notificaciones/:id')
  eliminar(
    @Param('id') id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.eliminar(id, usuario);
  }
}
