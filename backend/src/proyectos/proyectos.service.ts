import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Edicion } from './edicion.entity';
import { CrearProyectoDto } from './dto/crear-proyecto.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { EstadoPropuestaEvaluador } from '../common/enums/estado-propuesta-evaluador.enum';
import { campoFormularioVacio } from '../formularios/campo-formulario.util';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly proyectoRepo: Repository<Proyecto>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly participacionRepo: Repository<ParticipacionConvocatoria>,
    @InjectRepository(Emparejamiento)
    private readonly emparejamientoRepo: Repository<Emparejamiento>,
  ) {}

  async crearProyecto(dto: CrearProyectoDto, usuario: Usuario) {
    await this.validarConvocatoriaPresentacion(dto.convocatoriaId);

    const evaluador = await this.participacionRepo.findOne({
      where: {
        usuarioId: usuario.id,
        convocatoriaId: dto.convocatoriaId,
        rol: RolEjecucion.Evaluador,
      },
    });
    const estadosQueBloquean = [
      EstadoPropuestaEvaluador.Propuesto,
      EstadoPropuestaEvaluador.Aceptada,
      EstadoPropuestaEvaluador.Aprobado,
    ];
    if (evaluador?.estado && estadosQueBloquean.includes(evaluador.estado)) {
      throw new ForbiddenException(
        'No podés crear proyectos en una convocatoria donde sos evaluador',
      );
    }

    const proyecto = await this.proyectoRepo.save(
      this.proyectoRepo.create({
        nombre: dto.nombre,
        esConsolidado: dto.esConsolidado ?? false,
        esInterfacultad: dto.esInterfacultad ?? false,
        creadoPorId: usuario.id,
      }),
    );

    await this.edicionRepo.save(
      this.edicionRepo.create({
        proyectoId: proyecto.id,
        convocatoriaId: dto.convocatoriaId,
        estado: EstadoEdicion.Borrador,
        creadoPorId: usuario.id,
        unidadAcademicaId: usuario.unidadAcademicaId,
        anioEdicion: dto.anioEdicion || new Date().getFullYear(),
      }),
    );

    return this.obtenerProyecto(proyecto.id);
  }

  async listar(usuario: Usuario, convocatoriaId?: string) {
    const esRectorado = usuario.roles.some(r =>
      [RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado].includes(r),
    );
    const esSecretaria = usuario.roles.some(r =>
      [RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria].includes(r),
    );

    const query = this.edicionRepo.createQueryBuilder('edicion')
      .leftJoinAndSelect('edicion.proyecto', 'proyecto')
      .leftJoinAndSelect('proyecto.unidadAcademicaAdicional', 'unidadAcademicaAdicional')
      .leftJoinAndSelect('edicion.creadoPor', 'creadoPor')
      .leftJoinAndSelect('edicion.unidadAcademica', 'unidadAcademica')
      .leftJoinAndSelect('edicion.convocatoria', 'convocatoria')
      .where('edicion.eliminadoEn IS NULL')
      .orderBy('edicion.actualizadoEn', 'DESC');

    if (esRectorado) {
      // Rectorado ve todos los proyectos
    } else if (esSecretaria) {
      query.andWhere('edicion.unidadAcademicaId = :uaId', { uaId: usuario.unidadAcademicaId });
    } else {
      const participaciones = await this.participacionRepo.find({
        where: { usuarioId: usuario.id },
        select: { edicionId: true },
      });
      const edicionIds = participaciones
        .map(p => p.edicionId)
        .filter(Boolean) as string[];

      const poolIds = await this.edicionesEvaluablesParaEvaluador(usuario);

      const condiciones: string[] = ['edicion.creadoPorId = :userId'];
      const params: Record<string, unknown> = { userId: usuario.id };
      if (edicionIds.length > 0) {
        condiciones.push('edicion.id IN (:...edicionIds)');
        params.edicionIds = edicionIds;
      }
      if (poolIds.length > 0) {
        condiciones.push('edicion.id IN (:...poolIds)');
        params.poolIds = poolIds;
      }
      query.andWhere(`(${condiciones.join(' OR ')})`, params);
    }

    if (convocatoriaId) {
      query.andWhere('edicion.convocatoriaId = :convId', { convId: convocatoriaId });
    }

    return query.getMany();
  }

  // Ediciones que un evaluador aprobado puede ver para evaluar: las de su Unidad
  // Académica y las de la Unidad emparejada, en convocatorias en etapa de Evaluación.
  private async edicionesEvaluablesParaEvaluador(usuario: Usuario): Promise<string[]> {
    if (!usuario.unidadAcademicaId) return [];

    const participaciones = await this.participacionRepo.find({
      where: {
        usuarioId: usuario.id,
        rol: RolEjecucion.Evaluador,
        estado: EstadoPropuestaEvaluador.Aprobado,
      },
      select: { convocatoriaId: true },
    });
    if (participaciones.length === 0) return [];

    const convIds = participaciones.map(p => p.convocatoriaId);
    const convocatorias = await this.edicionRepo.manager.find(Convocatoria, {
      where: { id: In(convIds) },
      select: { id: true, estado: true },
    });
    const convEnEvaluacion = convocatorias
      .filter(c => c.estado === EstadoConvocatoria.Evaluacion)
      .map(c => c.id);
    if (convEnEvaluacion.length === 0) return [];

    const emparejamientos = await this.emparejamientoRepo.find({
      where: { convocatoriaId: In(convEnEvaluacion) },
      select: { convocatoriaId: true, unidadAId: true, unidadBId: true },
    });

    const poolIds = new Set<string>();
    for (const convId of convEnEvaluacion) {
      const par = emparejamientos.find(
        p => p.convocatoriaId === convId &&
          (p.unidadAId === usuario.unidadAcademicaId || p.unidadBId === usuario.unidadAcademicaId),
      );
      const uasPermitidas = new Set<string>([usuario.unidadAcademicaId]);
      if (par) {
        uasPermitidas.add(par.unidadAId === usuario.unidadAcademicaId ? par.unidadBId : par.unidadAId);
      }

      const ediciones = await this.edicionRepo.find({
        where: {
          convocatoriaId: convId,
          estado: EstadoEdicion.EnEvaluacion,
          eliminadoEn: IsNull(),
          unidadAcademicaId: In([...uasPermitidas]),
        },
        select: { id: true },
      });
      for (const ed of ediciones) poolIds.add(ed.id);
    }
    return [...poolIds];
  }

  async obtenerProyecto(id: string) {
    const proyecto = await this.proyectoRepo.findOne({
      where: { id },
      relations: { creadoPor: true, unidadAcademicaAdicional: true },
    });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const ediciones = await this.edicionRepo.find({
      where: { proyectoId: id },
      relations: {
        creadoPor: true,
        unidadAcademica: true,
        convocatoria: true,
      },
      order: { actualizadoEn: 'DESC' },
    });

    return { ...proyecto, ediciones };
  }

  async actualizarEdicion(
    proyectoId: string,
    edicionId: string,
    dto: ActualizarEdicionDto,
    usuario: Usuario,
  ) {
    const edicion = await this.obtenerEdicion(proyectoId, edicionId);

    await this.validarAccesoEdicion(edicion, usuario);
    this.validarEstadoEditable(edicion);

    if (dto.nombre !== undefined) {
      await this.proyectoRepo.update(proyectoId, { nombre: dto.nombre });
    }

    if (dto.esConsolidado !== undefined || dto.esInterfacultad !== undefined) {
      const updateData: Partial<Proyecto> = {};
      if (dto.esConsolidado !== undefined) updateData.esConsolidado = dto.esConsolidado;
      if (dto.esInterfacultad !== undefined) updateData.esInterfacultad = dto.esInterfacultad;
      await this.proyectoRepo.update(proyectoId, updateData);
    }

    if (dto.unidadAcademicaAdicionalId !== undefined) {
      await this.proyectoRepo.update(proyectoId, {
        unidadAcademicaAdicionalId: dto.unidadAcademicaAdicionalId || null,
      });
    }

    if (dto.anioEdicion !== undefined) {
      edicion.anioEdicion = dto.anioEdicion;
    }

    if (dto.presupuesto !== undefined) {
      edicion.presupuesto = dto.presupuesto;
    }

    if (dto.datosFormulario !== undefined) {
      edicion.datosFormulario = dto.datosFormulario;
    }

    await this.edicionRepo.save(edicion);

    return this.obtenerProyecto(proyectoId);
  }

  async enviarEdicion(proyectoId: string, edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(proyectoId, edicionId);

    await this.validarAccesoEdicion(edicion, usuario);
    this.validarEstadoEditable(edicion);
    await this.validarCompletitudParaEnvio(edicion, usuario);

    edicion.estado = EstadoEdicion.Presentado;
    await this.edicionRepo.save(edicion);

    return this.obtenerProyecto(proyectoId);
  }

  private async validarCompletitudParaEnvio(edicion: Edicion, usuario: Usuario): Promise<void> {
    const motivos: string[] = [];

    const esDocenteValidado = usuario.roles.includes(RolUsuario.Docente) &&
      usuario.estadoValidacionDocente === EstadoValidacionDocente.Validado;
    if (!esDocenteValidado) {
      motivos.push('Tu usuario no está validado');
    }

    const directores = await this.participacionRepo.find({
      where: { edicionId: edicion.id, rol: RolEjecucion.DirectorDeProyecto },
    });
    const tieneDirectorPrincipal = directores.some(d => d.esDirectorPrincipal);
    const tieneSegundoDirector = directores.length >= 2;
    if (!tieneDirectorPrincipal || !tieneSegundoDirector) {
      motivos.push('El proyecto no tiene usuarios de dirección ni codirección asignados aún');
    }

    const convocatoria = await this.edicionRepo.manager.findOne(Convocatoria, {
      where: { id: edicion.convocatoriaId },
      relations: { formulario: true },
    });
    const campos = convocatoria?.formulario?.campos ?? [];
    const datosFormulario = (edicion.datosFormulario as Record<string, unknown> | null) ?? {};
    const camposObligatoriosFaltantes = campos
      .filter(c => c.esObligatorio)
      .filter(c => campoFormularioVacio(c, datosFormulario[c.id]));
    if (camposObligatoriosFaltantes.length > 0) {
      motivos.push(
        `Faltan completar campos obligatorios: ${camposObligatoriosFaltantes.map(c => c.nombre).join(', ')}`,
      );
    }

    if (motivos.length > 0) {
      throw new BadRequestException(motivos.join('. '));
    }
  }

  private async obtenerEdicion(proyectoId: string, edicionId: string): Promise<Edicion> {
    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId, proyectoId },
      relations: {
        creadoPor: true,
        unidadAcademica: true,
        convocatoria: true,
        proyecto: true,
      },
    });
    if (!edicion) throw new NotFoundException('Edicion no encontrada');
    return edicion;
  }

  private async validarAccesoEdicion(edicion: Edicion, usuario: Usuario) {
    if (edicion.creadoPorId === usuario.id) return;

    const participacion = await this.participacionRepo.findOne({
      where: {
        usuarioId: usuario.id,
        edicionId: edicion.id,
        rol: RolEjecucion.DirectorDeProyecto,
      },
    });
    if (!participacion) {
      throw new ForbiddenException('No tenés permisos sobre esta edición');
    }
  }

  private async validarConvocatoriaPresentacion(convocatoriaId: string): Promise<void> {
    const convocatoria = await this.edicionRepo.manager.findOne(Convocatoria, {
      where: { id: convocatoriaId },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.estado !== EstadoConvocatoria.Presentacion) {
      throw new BadRequestException('La convocatoria no está en etapa de presentación');
    }
  }

  private validarEstadoEditable(edicion: Edicion) {
    if (edicion.estado !== EstadoEdicion.Borrador) {
      throw new BadRequestException(
        `No se puede modificar una edición en estado ${edicion.estado}`,
      );
    }
  }

  async eliminarEdicion(proyectoId: string, edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(proyectoId, edicionId);
    await this.validarAccesoEdicion(edicion, usuario);
    this.validarEstadoEditable(edicion);
    await this.edicionRepo.softDelete(edicionId);
    await this.participacionRepo.delete({ edicionId });
    return { message: 'Edición eliminada' };
  }
}
