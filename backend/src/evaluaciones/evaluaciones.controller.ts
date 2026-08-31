import { Controller, Get, Post, Put, Patch, Query, Body, Param, UseGuards } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { GuardarEvaluacionInstitucionalDto } from './dto/guardar-evaluacion-institucional.dto';
import { GuardarEvaluacionCruzadaDto } from './dto/guardar-evaluacion-cruzada.dto';
import { DesignarTerceraEvaluadorDto } from './dto/designar-tercera-evaluador.dto';
import { ListarEvaluacionesDto } from './dto/listar-evaluaciones.dto';
import { ActualizarPropuestaAdjudicacionDto } from './dto/actualizar-propuesta-adjudicacion.dto';
import { GuardarAdjudicacionDto, EmitirAdjudicacionDto } from './dto/adjudicacion.dto';
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

  @Get('convocatoria/:convocatoriaId/orden-merito/ua')
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria)
  ordenMeritoUa(
    @Param('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.ordenMeritoPorUa(convocatoriaId, usuario);
  }

  @Get('convocatoria/:convocatoriaId/orden-merito/docente')
  @Roles(RolUsuario.Docente)
  ordenMeritoDocente(
    @Param('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.ordenMeritoPorDocente(convocatoriaId, usuario);
  }

  @Post('convocatoria/:convocatoriaId/orden-merito')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  generarOrdenMerito(
    @Param('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.generarOrdenMerito(convocatoriaId, usuario);
  }

  @Patch('edicion/:edicionId/adjudicacion-propuesta')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  actualizarPropuestaAdjudicacion(
    @Param('edicionId') edicionId: string,
    @Body() dto: ActualizarPropuestaAdjudicacionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.actualizarPropuestaAdjudicacion(
      edicionId,
      dto.adjudicado,
      dto.mecanismo,
      usuario,
    );
  }

  @Post('convocatoria/:convocatoriaId/confirmar-orden-merito')
  @Roles(RolUsuario.AutoridadDeRectorado)
  confirmarOrdenMerito(
    @Param('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.confirmarOrdenMerito(convocatoriaId, usuario);
  }

  @Get('convocatoria/:convocatoriaId/adjudicacion')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  obtenerAdjudicacion(
    @Param('convocatoriaId') convocatoriaId: string,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.obtenerAdjudicacion(convocatoriaId, usuario);
  }

  @Put('convocatoria/:convocatoriaId/adjudicacion')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  guardarBorradorAdjudicacion(
    @Param('convocatoriaId') convocatoriaId: string,
    @Body() dto: GuardarAdjudicacionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.guardarBorradorAdjudicacion(convocatoriaId, dto, usuario);
  }

  @Post('convocatoria/:convocatoriaId/adjudicacion/emitir')
  @Roles(RolUsuario.AutoridadDeRectorado)
  emitirAdjudicacion(
    @Param('convocatoriaId') convocatoriaId: string,
    @Body() dto: EmitirAdjudicacionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.emitirAdjudicacion(convocatoriaId, dto, usuario);
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

  @Get('cruzadas/:edicionId/tercera-candidatos')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  candidatosTercera(
    @Param('edicionId') edicionId: string,
    @Query('convocatoriaId') convocatoriaId: string,
  ) {
    return this.service.listarCandidatosTercera(convocatoriaId, edicionId);
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
