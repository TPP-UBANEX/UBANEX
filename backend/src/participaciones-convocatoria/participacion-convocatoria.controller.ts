import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ParticipacionConvocatoriaService } from './participacion-convocatoria.service';
import { CrearParticipacionDto } from './dto/crear-participacion.dto';
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
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria, RolUsuario.AutoridadDeRectorado)
  asignar(@Body() dto: CrearParticipacionDto, @CurrentUser() usuario: Usuario) {
    return this.service.asignar(dto, usuario);
  }

  @Delete(':id')
  @Roles(RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria, RolUsuario.AutoridadDeRectorado)
  desasignar(@Param('id') id: string) {
    return this.service.desasignar(id);
  }

  @Get()
  listar(@Query('convocatoriaId') convocatoriaId: string) {
    return this.service.listarPorConvocatoria(convocatoriaId);
  }

  @Get('mias')
  listarMias(@CurrentUser() usuario: Usuario) {
    return this.service.listarMias(usuario.id);
  }
}
