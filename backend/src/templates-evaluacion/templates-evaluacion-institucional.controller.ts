import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TemplatesEvaluacionService } from './templates-evaluacion.service';
import { GuardarTemplateInstitucionalDto } from './dto/guardar-template-institucional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Controller('templates-evaluacion-institucional')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesEvaluacionInstitucionalController {
  constructor(private readonly service: TemplatesEvaluacionService) {}

  @Get()
  listar() {
    return this.service.listarInstitucionales();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtenerInstitucional(id);
  }

  @Post()
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  crear(@Body() dto: GuardarTemplateInstitucionalDto) {
    return this.service.crearInstitucional(dto);
  }

  @Put(':id')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  actualizar(@Param('id') id: string, @Body() dto: GuardarTemplateInstitucionalDto) {
    return this.service.actualizarInstitucional(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  eliminar(@Param('id') id: string) {
    return this.service.eliminarInstitucional(id);
  }
}
