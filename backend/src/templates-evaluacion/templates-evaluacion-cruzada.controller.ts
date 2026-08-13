import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TemplatesEvaluacionService } from './templates-evaluacion.service';
import { GuardarTemplateCruzadaDto } from './dto/guardar-template-cruzada.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Controller('templates-evaluacion-cruzada')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesEvaluacionCruzadaController {
  constructor(private readonly service: TemplatesEvaluacionService) {}

  @Get()
  listar() {
    return this.service.listarCruzadas();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtenerCruzada(id);
  }

  @Post()
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  crear(@Body() dto: GuardarTemplateCruzadaDto) {
    return this.service.crearCruzada(dto);
  }

  @Put(':id')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  actualizar(@Param('id') id: string, @Body() dto: GuardarTemplateCruzadaDto) {
    return this.service.actualizarCruzada(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  eliminar(@Param('id') id: string) {
    return this.service.eliminarCruzada(id);
  }
}
