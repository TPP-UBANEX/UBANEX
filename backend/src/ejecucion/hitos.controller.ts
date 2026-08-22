import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { EjecucionService } from './ejecucion.service';
import { CrearHitoDto, ActualizarHitoDto } from './dto/hito.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('hitos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HitosController {
  constructor(private readonly service: EjecucionService) {}

  @Get('ediciones/:edicionId')
  @Roles(
    RolUsuario.Docente,
    RolUsuario.Estudiante,
    RolUsuario.AutoridadDeSecretaria,
    RolUsuario.AsistenteDeSecretaria,
    RolUsuario.AutoridadDeRectorado,
    RolUsuario.AsistenteDeRectorado,
  )
  listar(@Param('edicionId') edicionId: string, @CurrentUser() usuario: Usuario) {
    return this.service.listarHitos(edicionId, usuario);
  }

  @Post('ediciones/:edicionId')
  crear(
    @Param('edicionId') edicionId: string,
    @Body() dto: CrearHitoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.crearHito(edicionId, dto, usuario);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarHitoDto, @CurrentUser() usuario: Usuario) {
    return this.service.actualizarHito(id, dto, usuario);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.eliminarHito(id, usuario);
  }
}