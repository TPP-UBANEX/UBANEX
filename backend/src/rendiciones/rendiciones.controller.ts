import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { RendicionesService } from './rendiciones.service';
import { CrearRendicionDto } from './dto/crear-rendicion.dto';
import { ActualizarRendicionDto } from './dto/actualizar-rendicion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from '../usuarios/usuario.entity';

const ROLES_ACCESO = [
  RolUsuario.Docente,
  RolUsuario.Estudiante,
  RolUsuario.AutoridadDeSecretaria,
  RolUsuario.AsistenteDeSecretaria,
  RolUsuario.AutoridadDeRectorado,
  RolUsuario.AsistenteDeRectorado,
];

const ROLES_ESCRITURA = [RolUsuario.Docente, RolUsuario.Estudiante];

@Controller('rendiciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RendicionesController {
  constructor(private readonly service: RendicionesService) {}

  @Get()
  @Roles(...ROLES_ACCESO)
  listar(@Query('edicionId') edicionId: string, @CurrentUser() usuario: Usuario) {
    return this.service.listarPorEdicion(edicionId, usuario);
  }

  @Post()
  @Roles(...ROLES_ESCRITURA)
  crear(@Body() dto: CrearRendicionDto, @CurrentUser() usuario: Usuario) {
    return this.service.crear(dto, usuario);
  }

  @Patch(':id')
  @Roles(...ROLES_ACCESO)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarRendicionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.actualizar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles(...ROLES_ESCRITURA)
  eliminar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.eliminar(id, usuario);
  }
}
