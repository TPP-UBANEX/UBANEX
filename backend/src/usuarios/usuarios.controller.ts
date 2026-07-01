import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { ActualizarEstadoDirectorDto } from './dto/actualizar-estado-director.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from './usuario.entity';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AutoridadDeSecretaria)
  crear(@Body() dto: CrearUsuarioDto, @CurrentUser() usuario: Usuario) {
    return this.service.crear(dto, usuario);
  }

  @Get()
  @Roles(
    RolUsuario.AutoridadDeRectorado,
    RolUsuario.AsistenteDeRectorado,
    RolUsuario.AutoridadDeSecretaria,
    RolUsuario.AsistenteDeSecretaria,
  )
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.actualizar(id, dto, usuario);
  }

  @Patch(':id/estado-director')
  @Roles(RolUsuario.AutoridadDeSecretaria)
  actualizarEstadoDirector(
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoDirectorDto,
  ) {
    return this.service.actualizarEstadoDirector(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.AutoridadDeRectorado)
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}
