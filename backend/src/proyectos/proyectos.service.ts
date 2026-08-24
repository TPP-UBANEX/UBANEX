import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Edicion } from './edicion.entity';
import { CrearProyectoDto } from './dto/crear-proyecto.dto';
import { ResubirProyectoDto } from './dto/resubir-proyecto.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Formulario } from '../formularios/formulario.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { EstadoPropuestaEvaluador } from '../common/enums/estado-propuesta-evaluador.enum';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { ListarProyectosDto } from './dto/listar-proyectos.dto';
import { camposIncompletosParaEnvio, validarValoresFormulario } from '../formularios/campo-formulario.util';
import { CampoFormulario } from '../formularios/campo-formulario.interface';
import { normalizarPresupuesto, presupuestoIncompletoParaEnvio, validarPresupuesto } from './presupuesto.util';

const CAMPOS_EDICION_AUTORIDAD = ['esConsolidado', 'esInterfacultad', 'unidadAcademicaAdicionalId'];
const ESTADOS_EDITABLES_AUTORIDAD = [
  EstadoEdicion.Borrador,
  EstadoEdicion.Presentado,
  EstadoEdicion.PendienteDeCambios,
];

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
    @InjectRepository(Formulario)
    private readonly formularioRepo: Repository<Formulario>,
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
    if (evaluador) {
      throw new ForbiddenException(
        'No podés crear proyectos en una convocatoria donde sos evaluador',
      );
    }

    const proyecto = await this.proyectoRepo.save(
      this.proyectoRepo.create({
        nombre: dto.nombre,
        esConsolidado: null,
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

  async resubirProyecto(proyectoId: string, dto: ResubirProyectoDto, usuario: Usuario) {
    const proyecto = await this.proyectoRepo.findOne({ where: { id: proyectoId } });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    await this.validarConvocatoriaPresentacion(dto.convocatoriaId);

    const edicionExistente = await this.edicionRepo.findOne({
      where: { proyectoId, convocatoriaId: dto.convocatoriaId },
    });
    if (edicionExistente) {
      throw new BadRequestException('Este proyecto ya tiene una edición en esta convocatoria');
    }

    const evaluador = await this.participacionRepo.findOne({
      where: {
        usuarioId: usuario.id,
        convocatoriaId: dto.convocatoriaId,
        rol: RolEjecucion.Evaluador,
      },
    });
    if (evaluador) {
      throw new ForbiddenException(
        'No podés resubir proyectos en una convocatoria donde sos evaluador',
      );
    }

    const ultimaEdicion = await this.edicionRepo.findOne({
      where: { proyectoId },
      order: { anioEdicion: 'DESC', actualizadoEn: 'DESC' },
    });

    let datosFormularioMapeados: Record<string, unknown> | null = null;
    if (ultimaEdicion?.datosFormulario) {
      const convNueva = await this.edicionRepo.manager.findOne(Convocatoria, {
        where: { id: dto.convocatoriaId },
        relations: { formulario: true },
      });
      const convVieja = await this.edicionRepo.manager.findOne(Convocatoria, {
        where: { id: ultimaEdicion.convocatoriaId },
        relations: { formulario: true },
      });
      if (convNueva?.formulario?.campos && convVieja?.formulario?.campos) {
        datosFormularioMapeados = this.mapearDatosFormulario(
          ultimaEdicion.datosFormulario as Record<string, unknown>,
          convVieja.formulario.campos,
          convNueva.formulario.campos,
        );
      }
    }

    const nuevaEdicion = await this.edicionRepo.save(
      this.edicionRepo.create({
        proyectoId,
        convocatoriaId: dto.convocatoriaId,
        estado: EstadoEdicion.Borrador,
        creadoPorId: usuario.id,
        unidadAcademicaId: usuario.unidadAcademicaId,
        anioEdicion: dto.anioEdicion || new Date().getFullYear(),
        presupuesto: ultimaEdicion?.presupuesto ?? null,
        datosFormulario: datosFormularioMapeados,
      }),
    );

    if (ultimaEdicion) {
      const directoresPrevios = await this.participacionRepo.find({
        where: {
          edicionId: ultimaEdicion.id,
          rol: RolEjecucion.DirectorDeProyecto,
        },
      });

      for (const dir of directoresPrevios) {
        const yaTieneParticipacion = await this.participacionRepo.findOne({
          where: {
            usuarioId: dir.usuarioId,
            convocatoriaId: dto.convocatoriaId,
          },
        });
        if (yaTieneParticipacion) continue;

        await this.participacionRepo.save(
          this.participacionRepo.create({
            usuarioId: dir.usuarioId,
            convocatoriaId: dto.convocatoriaId,
            rol: RolEjecucion.DirectorDeProyecto,
            edicionId: nuevaEdicion.id,
            esDirectorPrincipal: dir.esDirectorPrincipal,
            asignadoPorId: usuario.id,
          }),
        );
      }
    }

    return this.obtenerProyecto(proyectoId);
  }

  private mapearDatosFormulario(
    datosViejos: Record<string, unknown>,
    camposViejos: CampoFormulario[],
    camposNuevos: CampoFormulario[],
  ): Record<string, unknown> {
    const mapaViejo = new Map(camposViejos.map(c => [c.id, c]));
    const mapaNuevo = new Map(camposNuevos.map(c => [c.nombre, c]));

    const resultado: Record<string, unknown> = {};
    for (const [idVieja, valor] of Object.entries(datosViejos)) {
      const campoViejo = mapaViejo.get(idVieja);
      if (!campoViejo) continue;
      if (campoViejo.tipo === 'tabla') continue;
      const campoNuevo = mapaNuevo.get(campoViejo.nombre);
      if (!campoNuevo) continue;
      resultado[campoNuevo.id] = valor;
    }
    return resultado;
  }

  private async buildListado(
    usuario: Usuario,
    filtros: {
      convocatoriaId?: string;
      estado?: EstadoEdicion;
      anio?: number;
      search?: string;
    },
  ) {
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

    if (filtros.convocatoriaId) {
      query.andWhere('edicion.convocatoriaId = :convId', { convId: filtros.convocatoriaId });
    }
    if (filtros.estado) {
      query.andWhere('edicion.estado = :estado', { estado: filtros.estado });
    }
    if (filtros.anio) {
      query.andWhere('edicion.anioEdicion = :anio', { anio: filtros.anio });
    }
    if (filtros.search) {
      query.andWhere('proyecto.nombre ILIKE :search', { search: `%${filtros.search}%` });
    }

    return query;
  }

  async listar(usuario: Usuario, dto: ListarProyectosDto): Promise<PaginatedResponse<Edicion>> {
    const { page = 1, limit = 10 } = dto;
    const query = await this.buildListado(usuario, dto);
    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async listarTodas(usuario: Usuario, convocatoriaId?: string): Promise<Edicion[]> {
    const query = await this.buildListado(usuario, { convocatoriaId });
    return query.getMany();
  }

  async proyectosDisponiblesParaResubir(usuario: Usuario, convocatoriaId: string, search?: string) {
    const query = this.edicionRepo.createQueryBuilder('edicion')
      .innerJoin('edicion.proyecto', 'proyecto')
      .leftJoinAndSelect('edicion.unidadAcademica', 'unidadAcademica')
      .where('edicion.eliminadoEn IS NULL')
      .andWhere('proyecto.id NOT IN (SELECT e2."proyectoId" FROM edicion e2 WHERE e2."convocatoriaId" = :convId AND e2."eliminadoEn" IS NULL)', { convId: convocatoriaId })
      .orderBy('proyecto.nombre', 'ASC')
      .select(['proyecto.id AS "proyectoId"', 'proyecto.nombre AS "proyectoNombre"', 'proyecto."esConsolidado" AS "esConsolidado"']);

    const esRectorado = usuario.roles.some(r =>
      [RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado].includes(r),
    );
    const esSecretaria = usuario.roles.some(r =>
      [RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria].includes(r),
    );

    if (!esRectorado && !esSecretaria) {
      const participaciones = await this.participacionRepo.find({
        where: { usuarioId: usuario.id },
        select: { edicionId: true },
      });
      const edicionIds = participaciones.map(p => p.edicionId).filter(Boolean) as string[];

      const condiciones: string[] = ['edicion.creadoPorId = :userId'];
      const params: Record<string, unknown> = { userId: usuario.id };
      if (edicionIds.length > 0) {
        condiciones.push('edicion.id IN (:...edicionIds)');
        params.edicionIds = edicionIds;
      }
      query.andWhere(`(${condiciones.join(' OR ')})`, params);
    }

    if (search) {
      query.andWhere('proyecto.nombre ILIKE :search', { search: `%${search}%` });
    }

    query.groupBy('proyecto.id')
      .addGroupBy('proyecto.nombre')
      .addGroupBy('proyecto."esConsolidado"');

    return query.getRawMany();
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

    if (await this.esCreadorODirector(edicion, usuario)) {
      this.validarEstadoEditable(edicion);
    } else if (this.esAutoridad(usuario)) {
      const camposNoPermitidos = Object.keys(dto).filter(
        campo => !CAMPOS_EDICION_AUTORIDAD.includes(campo),
      );
      if (camposNoPermitidos.length > 0) {
        throw new ForbiddenException(
          'Las autoridades solo pueden modificar si es interfacultad y las direcciones; el resto requiere una sugerencia de cambio',
        );
      }
      if (!ESTADOS_EDITABLES_AUTORIDAD.includes(edicion.estado)) {
        throw new BadRequestException(
          `No se puede modificar una edición en estado ${edicion.estado}`,
        );
      }
    } else {
      throw new ForbiddenException('No tenés permisos sobre esta edición');
    }

    if (dto.nombre !== undefined) {
      await this.proyectoRepo.update(proyectoId, { nombre: dto.nombre });
    }

    // El consolidado es un override administrativo: solo lo puede tocar una autoridad.
    const puedeOverrideConsolidado = this.esAutoridad(usuario);
    const updateData: Partial<Proyecto> = {};
    if (dto.esConsolidado !== undefined && puedeOverrideConsolidado) {
      updateData.esConsolidado = dto.esConsolidado;
    }
    if (dto.esInterfacultad !== undefined) updateData.esInterfacultad = dto.esInterfacultad;
    if (Object.keys(updateData).length > 0) {
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
      validarPresupuesto(dto.presupuesto);
      edicion.presupuesto = normalizarPresupuesto(dto.presupuesto);
    }

    if (dto.datosFormulario !== undefined) {
      const campos = await this.obtenerCamposFormulario(edicion.convocatoriaId);
      validarValoresFormulario(campos, dto.datosFormulario as Record<string, unknown>);
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

    const campos = await this.obtenerCamposFormulario(edicion.convocatoriaId);
    const datosFormulario = (edicion.datosFormulario as Record<string, unknown> | null) ?? {};
    const camposIncompletos = camposIncompletosParaEnvio(campos, datosFormulario);
    if (camposIncompletos.length > 0) {
      motivos.push(
        `Faltan completar campos obligatorios: ${camposIncompletos.join(', ')}`,
      );
    }

    const presupuestoIncompleto = presupuestoIncompletoParaEnvio(edicion.presupuesto, edicion.convocatoria);
    if (presupuestoIncompleto.length > 0) {
      motivos.push(`Presupuesto: ${presupuestoIncompleto.join(', ')}`);
    }

    if (motivos.length > 0) {
      throw new BadRequestException(motivos.join('. '));
    }
  }

  private async obtenerCamposFormulario(convocatoriaId: string): Promise<CampoFormulario[]> {
    const convocatoria = await this.edicionRepo.manager.findOne(Convocatoria, {
      where: { id: convocatoriaId },
      relations: { formulario: true },
    });
    return convocatoria?.formulario?.campos ?? [];
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

  private async esCreadorODirector(edicion: Edicion, usuario: Usuario): Promise<boolean> {
    if (edicion.creadoPorId === usuario.id) return true;

    const participacion = await this.participacionRepo.findOne({
      where: {
        usuarioId: usuario.id,
        edicionId: edicion.id,
        rol: RolEjecucion.DirectorDeProyecto,
      },
    });
    return !!participacion;
  }

  private esAutoridad(usuario: Usuario): boolean {
    return usuario.roles.some(r =>
      [
        RolUsuario.AutoridadDeRectorado,
        RolUsuario.AsistenteDeRectorado,
        RolUsuario.AutoridadDeSecretaria,
        RolUsuario.AsistenteDeSecretaria,
      ].includes(r),
    );
  }

  private async validarAccesoEdicion(edicion: Edicion, usuario: Usuario) {
    if (!(await this.esCreadorODirector(edicion, usuario))) {
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

  async iniciarEvaluacion(proyectoId: string, edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(proyectoId, edicionId);

    const esRectorado = usuario.roles.some(r =>
      [RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado].includes(r),
    );
    const esSecretariaMismaUA = usuario.roles.some(r =>
      [RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria].includes(r),
    ) && usuario.unidadAcademicaId === edicion.unidadAcademicaId;
    if (!esRectorado && !esSecretariaMismaUA) {
      throw new ForbiddenException(
        'Solo la Secretaría de la Unidad Académica del proyecto o el Rectorado pueden iniciar la evaluación',
      );
    }

    const convocatoria = await this.edicionRepo.manager.findOne(Convocatoria, {
      where: { id: edicion.convocatoriaId },
      relations: {
        templateEvaluacionInstitucional: true,
        templateEvaluacionCruzada: true,
      },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.estado !== EstadoConvocatoria.Evaluacion) {
      throw new BadRequestException('La convocatoria no está en etapa de evaluación');
    }
    if (!convocatoria.templateEvaluacionInstitucional) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación institucional',
      );
    }
    if (!convocatoria.templateEvaluacionCruzada) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación cruzada',
      );
    }

    if (edicion.estado !== EstadoEdicion.Presentado && edicion.estado !== EstadoEdicion.PendienteDeCambios) {
      throw new BadRequestException(
        `No se puede iniciar la evaluación de una edición en estado ${edicion.estado}`,
      );
    }

    edicion.estado = EstadoEdicion.EnEvaluacion;
    await this.edicionRepo.save(edicion);

    return this.obtenerProyecto(proyectoId);
  }
}
