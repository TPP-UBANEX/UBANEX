import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { OrganizacionesAsociadasService } from './organizaciones-asociadas.service';
import {
  CrearOrganizacionAsociadaDto, ActualizarOrganizacionAsociadaDto,
} from './dto/organizacion-asociada.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('organizaciones-asociadas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizacionesAsociadasController {
  constructor(private readonly service: OrganizacionesAsociadasService) {}

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
    return this.service.listar(edicionId, usuario);
  }

  @Post('ediciones/:edicionId')
  crear(
    @Param('edicionId') edicionId: string,
    @Body() dto: CrearOrganizacionAsociadaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.crear(edicionId, dto, usuario);
  }

  @Put(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarOrganizacionAsociadaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.actualizar(id, dto, usuario);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.eliminar(id, usuario);
  }
}
