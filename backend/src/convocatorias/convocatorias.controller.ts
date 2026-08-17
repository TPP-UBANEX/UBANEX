import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ConvocatoriasService } from './convocatorias.service';
import { ListarConvocatoriasDto } from './dto/listar-convocatorias.dto';
import { CrearConvocatoriaDto } from './dto/crear-convocatoria.dto';
import { ActualizarConvocatoriaDto } from './dto/actualizar-convocatoria.dto';
import { GuardarEmparejamientoDto } from './dto/guardar-emparejamiento.dto';
import { GuardarFormularioDto } from './dto/guardar-formulario.dto';
import { GuardarEstructuraInstitucionalDto, GuardarEstructuraCruzadaDto } from './dto/guardar-estructura-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Usuario } from '../usuarios/usuario.entity';

@Controller('convocatorias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConvocatoriasController {
  constructor(private readonly service: ConvocatoriasService) {}

  @Get()
  listar(@CurrentUser() usuario: Usuario, @Query() dto: ListarConvocatoriasDto) {
    return this.service.listar(usuario, dto);
  }

  @Get('todas')
  listarTodas(@CurrentUser() usuario: Usuario) {
    return this.service.listarTodas(usuario);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Post()
  @Roles(RolUsuario.AutoridadDeRectorado)
  crear(@Body() dto: CrearConvocatoriaDto, @CurrentUser() usuario: Usuario) {
    return this.service.crear(dto, usuario);
  }

  @Patch(':id')
  @Roles(RolUsuario.AutoridadDeRectorado)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarConvocatoriaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.actualizar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles(RolUsuario.AutoridadDeRectorado)
  eliminar(@Param('id') id: string, @CurrentUser() usuario: Usuario) {
    return this.service.eliminar(id, usuario);
  }

  @Get(':id/emparejamientos')
  obtenerEmparejamientos(@Param('id') id: string) {
    return this.service.obtenerEmparejamientos(id);
  }

  @Put(':id/emparejamientos')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  guardarEmparejamientos(
    @Param('id') id: string,
    @Body() dto: GuardarEmparejamientoDto,
  ) {
    return this.service.guardarEmparejamientos(id, dto);
  }

  @Get(':id/formulario')
  obtenerFormulario(@Param('id') id: string) {
    return this.service.obtenerFormulario(id);
  }

  @Put(':id/formulario')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  guardarFormulario(
    @Param('id') id: string,
    @Body() dto: GuardarFormularioDto,
  ) {
    return this.service.guardarFormulario(id, dto);
  }

  @Get(':id/template-evaluacion-institucional')
  obtenerTemplateInstitucional(@Param('id') id: string) {
    return this.service.obtenerTemplateInstitucional(id);
  }

  @Put(':id/template-evaluacion-institucional')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  guardarTemplateInstitucional(
    @Param('id') id: string,
    @Body() dto: GuardarEstructuraInstitucionalDto,
  ) {
    return this.service.guardarTemplateInstitucional(id, dto);
  }

  @Get(':id/template-evaluacion-cruzada')
  obtenerTemplateCruzada(@Param('id') id: string) {
    return this.service.obtenerTemplateCruzada(id);
  }

  @Put(':id/template-evaluacion-cruzada')
  @Roles(RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado)
  guardarTemplateCruzada(
    @Param('id') id: string,
    @Body() dto: GuardarEstructuraCruzadaDto,
  ) {
    return this.service.guardarTemplateCruzada(id, dto);
  }
}
