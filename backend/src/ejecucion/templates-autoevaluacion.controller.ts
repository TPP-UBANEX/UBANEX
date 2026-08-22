import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { EjecucionService } from './ejecucion.service';
import { GuardarTemplateAutoevaluacionDto } from './dto/guardar-template-autoevaluacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Controller('templates-autoevaluacion-impacto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesAutoevaluacionController {
  constructor(private readonly service: EjecucionService) {}

  @Get()
  listar() {
    return this.service.listarTemplates();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtenerTemplate(id);
  }

  @Post()
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  crear(@Body() dto: GuardarTemplateAutoevaluacionDto) {
    return this.service.crearTemplate(dto);
  }

  @Put(':id')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  actualizar(@Param('id') id: string, @Body() dto: GuardarTemplateAutoevaluacionDto) {
    return this.service.actualizarTemplate(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  eliminar(@Param('id') id: string) {
    return this.service.eliminarTemplate(id);
  }
}