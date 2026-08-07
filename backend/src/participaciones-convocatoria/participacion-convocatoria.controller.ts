import {
  Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ParticipacionConvocatoriaService } from './participacion-convocatoria.service';
import { CrearParticipacionDto } from './dto/crear-participacion.dto';
import { ActualizarEstadoParticipacionDto } from './dto/actualizar-estado-participacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('participaciones-convocatoria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParticipacionConvocatoriaController {
  constructor(private readonly service: ParticipacionConvocatoriaService) {}

  @Post()
  asignar(@Body() dto: CrearParticipacionDto, @CurrentUser() usuario: Usuario) {
    return this.service.asignar(dto, usuario);
  }

  @Delete(':id')
  desasignar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.desasignar(id, usuario);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.AutoridadDeRectorado)
  actualizarEstado(
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoParticipacionDto,
  ) {
    return this.service.actualizarEstado(id, dto);
  }

  @Post(':id/aceptar')
  aceptar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.responder(id, usuario, true);
  }

  @Post(':id/declinar')
  declinar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.responder(id, usuario, false);
  }

  @Get()
  listar(@Query('convocatoriaId') convocatoriaId: string) {
    return this.service.listarPorConvocatoria(convocatoriaId);
  }

  @Get('candidatos')
  candidatos(
    @Query('unidadAcademicaId') unidadAcademicaId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @Query('edicionId') edicionId?: string,
    @Query('unidadAcademicaAdicionalId') unidadAcademicaAdicionalId?: string,
  ) {
    return this.service.listarCandidatos(
      unidadAcademicaId,
      convocatoriaId,
      edicionId,
      unidadAcademicaAdicionalId,
    );
  }

  @Get('mias')
  listarMias(@CurrentUser() usuario: Usuario) {
    return this.service.listarMias(usuario.id);
  }
}
