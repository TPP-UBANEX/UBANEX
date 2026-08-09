import { Controller, Get, Post, Put, Query, Body, Param, UseGuards } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { GuardarEvaluacionInstitucionalDto } from './dto/guardar-evaluacion-institucional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('evaluaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluacionesController {
  constructor(private readonly service: EvaluacionesService) {}

  @Get()
  findAll(@Query('proyectoId') _proyectoId?: string) {
    return this.service.findAll();
  }

  @Get('institucionales')
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria)
  listarInstitucionales(
    @Query('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.listarInstitucionales(convocatoriaId, usuario);
  }

  @Get('institucionales/:edicionId')
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria)
  obtenerInstitucional(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.obtenerInstitucional(convocatoriaId, edicionId, usuario);
  }

  @Put('institucionales/:edicionId')
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria)
  guardarInstitucional(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @Body() dto: GuardarEvaluacionInstitucionalDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.guardarInstitucional(convocatoriaId, edicionId, dto, usuario);
  }

  @Post('institucionales/:edicionId/confirmar')
  @Roles(RolUsuario.AutoridadDeSecretaria)
  confirmarInstitucional(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.confirmarInstitucional(convocatoriaId, edicionId, usuario);
  }
}
