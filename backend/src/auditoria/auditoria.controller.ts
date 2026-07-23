import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get(':id/auditoria')
  listar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.listarPorUsuario(id, usuario);
  }
}
