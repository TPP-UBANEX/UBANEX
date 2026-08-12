import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FormulariosService } from './formularios.service';
import { CrearPlantillaDto } from './dto/crear-plantilla.dto';
import { ActualizarPlantillaDto } from './dto/actualizar-plantilla.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

const ROLES_RECTORADO = [
  RolUsuario.AutoridadDeRectorado,
  RolUsuario.AsistenteDeRectorado,
];

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
  @Roles(...ROLES_RECTORADO)
  crear(@Body() dto: CrearPlantillaDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  @Roles(...ROLES_RECTORADO)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarPlantillaDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(...ROLES_RECTORADO)
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}
