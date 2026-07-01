import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { UnidadesAcademicasService } from './unidades-academicas.service';
import { CrearUnidadAcademicaDto } from './dto/crear-unidad-academica.dto';
import { ActualizarUnidadAcademicaDto } from './dto/actualizar-unidad-academica.dto';

@Controller('unidades-academicas')
export class UnidadesAcademicasController {
  constructor(private readonly service: UnidadesAcademicasService) {}

  @Post()
  crear(@Body() dto: CrearUnidadAcademicaDto) {
    return this.service.crear(dto);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUnidadAcademicaDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}
