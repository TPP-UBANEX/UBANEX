import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get(':id/auditoria')
  @Roles(
    RolUsuario.AutoridadDeRectorado,
    RolUsuario.AsistenteDeRectorado,
    RolUsuario.AutoridadDeSecretaria,
    RolUsuario.AsistenteDeSecretaria,
  )
  listar(@Param('id') id: string) {
    return this.service.listarPorUsuario(id);
  }
}
