import { Controller, Get, Post, Put, Query, Body, Param, UseGuards } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { GuardarEvaluacionInstitucionalDto } from './dto/guardar-evaluacion-institucional.dto';
import { GuardarEvaluacionCruzadaDto } from './dto/guardar-evaluacion-cruzada.dto';
import { DesignarTerceraEvaluadorDto } from './dto/designar-tercera-evaluador.dto';
import { ListarEvaluacionesDto } from './dto/listar-evaluaciones.dto';
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
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  monitoreo(@Query() dto: ListarEvaluacionesDto) {
    return this.service.monitoreo(dto.convocatoriaId ?? '', dto);
  }

  @Get('edicion/:edicionId')
  evaluacionDeEdicion(@Param('edicionId') edicionId: string, @CurrentUser() usuario: Usuario) {
    return this.service.evaluacionDeEdicion(edicionId, usuario);
  }

  @Get('institucionales')
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria)
  listarInstitucionales(
    @Query() dto: ListarEvaluacionesDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.listarInstitucionales(dto.convocatoriaId ?? '', usuario, dto);
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

  @Get('institucionales/:edicionId/historial')
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria)
  historialInstitucional(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.historialInstitucional(convocatoriaId, edicionId, usuario);
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

  @Get('cruzadas/disponibles')
  listarCruzadasDisponibles(
    @Query() dto: ListarEvaluacionesDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.listarCruzadasDisponibles(dto.convocatoriaId ?? '', usuario, dto);
  }

  @Get('cruzadas/:edicionId')
  obtenerCruzada(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.obtenerCruzada(convocatoriaId, edicionId, usuario);
  }

  @Get('cruzadas/:edicionId/historial')
  historialCruzada(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.historialCruzada(convocatoriaId, edicionId, usuario);
  }

  @Put('cruzadas/:edicionId')
  guardarCruzada(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @Body() dto: GuardarEvaluacionCruzadaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.guardarCruzada(convocatoriaId, edicionId, dto, usuario);
  }

  @Post('cruzadas/:edicionId/confirmar')
  confirmarCruzada(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.confirmarCruzada(convocatoriaId, edicionId, usuario);
  }

  @Post('cruzadas/:edicionId/designar-tercera')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  designarTercera(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
    @Body() dto: DesignarTerceraEvaluadorDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.designarTercera(convocatoriaId, edicionId, dto.evaluadorId, usuario);
  }
}
