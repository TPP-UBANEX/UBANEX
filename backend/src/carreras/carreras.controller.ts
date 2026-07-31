import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CarrerasService } from './carreras.service';
import { CrearCarreraDto } from './dto/crear-carrera.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Controller('carreras')
export class CarrerasController {
  constructor(private readonly service: CarrerasService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  crear(@Body() dto: CrearCarreraDto) {
    return this.service.crear(dto);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get('unidad-academica/:unidadAcademicaId')
  listarPorUnidadAcademica(@Param('unidadAcademicaId') unidadAcademicaId: string) {
    return this.service.listarPorUnidadAcademica(unidadAcademicaId);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }
}
