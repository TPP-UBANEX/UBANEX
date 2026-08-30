import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ParticipacionConvocatoriaService } from './participacion-convocatoria.service';
import { CrearParticipacionDto } from './dto/crear-participacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
    @Query('incluirBloqueados') incluirBloqueados?: string,
  ) {
    return this.service.listarCandidatos(
      unidadAcademicaId,
      convocatoriaId,
      edicionId,
      unidadAcademicaAdicionalId,
      incluirBloqueados === 'true',
    );
  }

  @Get('mias')
  listarMias(@CurrentUser() usuario: Usuario) {
    return this.service.listarMias(usuario.id);
  }
}
