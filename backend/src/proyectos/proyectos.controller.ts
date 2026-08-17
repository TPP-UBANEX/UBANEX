import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards,
} from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CrearProyectoDto } from './dto/crear-proyecto.dto';
import { ResubirProyectoDto } from './dto/resubir-proyecto.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { ListarProyectosDto } from './dto/listar-proyectos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('proyectos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProyectosController {
  constructor(private readonly service: ProyectosService) {}

  @Post()
  @Roles(RolUsuario.Estudiante, RolUsuario.Docente)
  crear(@Body() dto: CrearProyectoDto, @CurrentUser() usuario: Usuario) {
    return this.service.crearProyecto(dto, usuario);
  }

  @Post(':id/resubir')
  @Roles(RolUsuario.Estudiante, RolUsuario.Docente)
  resubir(
    @Param('id') id: string,
    @Body() dto: ResubirProyectoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.resubirProyecto(id, dto, usuario);
  }

  @Get()
  listar(@CurrentUser() usuario: Usuario, @Query() dto: ListarProyectosDto) {
    return this.service.listar(usuario, dto);
  }

  @Get('todas')
  listarTodas(
    @CurrentUser() usuario: Usuario,
    @Query('convocatoriaId') convocatoriaId?: string,
  ) {
    return this.service.listarTodas(usuario, convocatoriaId);
  }

  @Get('disponibles-para-resubir')
  disponiblesParaResubir(
    @CurrentUser() usuario: Usuario,
    @Query('convocatoriaId') convocatoriaId: string,
    @Query('search') search?: string,
  ) {
    return this.service.proyectosDisponiblesParaResubir(usuario, convocatoriaId, search);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtenerProyecto(id);
  }

  @Patch(':id/ediciones/:edicionId')
  actualizarEdicion(
    @Param('id') id: string,
    @Param('edicionId') edicionId: string,
    @Body() dto: ActualizarEdicionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.actualizarEdicion(id, edicionId, dto, usuario);
  }

  @Post(':id/ediciones/:edicionId/enviar')
  enviarEdicion(
    @Param('id') id: string,
    @Param('edicionId') edicionId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.enviarEdicion(id, edicionId, usuario);
  }

  @Post(':id/ediciones/:edicionId/iniciar-evaluacion')
  iniciarEvaluacion(
    @Param('id') id: string,
    @Param('edicionId') edicionId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.iniciarEvaluacion(id, edicionId, usuario);
  }

  @Delete(':id/ediciones/:edicionId')
  eliminarEdicion(
    @Param('id') id: string,
    @Param('edicionId') edicionId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.eliminarEdicion(id, edicionId, usuario);
  }
}
