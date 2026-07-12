import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { FormulariosService } from './formularios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Controller('formularios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormulariosController {
  constructor(private readonly service: FormulariosService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Post()
  @Roles(RolUsuario.AutoridadDeRectorado)
  crear(@Body() dto: { nombre: string; esDefault?: boolean }) {
    return this.service.crear(dto);
  }
}
