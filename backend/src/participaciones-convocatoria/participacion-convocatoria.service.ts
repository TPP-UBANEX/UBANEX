import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { ParticipacionConvocatoria } from './participacion-convocatoria.entity';
import { CrearParticipacionDto } from './dto/crear-participacion.dto';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/mail/mail.service';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { EstadoPropuestaEvaluador } from '../common/enums/estado-propuesta-evaluador.enum';
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';
import { CANTIDAD_EVALUADORES_POR_UA } from '../common/constantes';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';

type CampoPerfil = {
  campo:
    | 'nombre' | 'apellido' | 'telefono' | 'cargoDocente'
    | 'tipoDesignacionDocente' | 'genero' | 'areaDocente'
    | 'personaConDiscapacidad' | 'direccionLocalidad';
  etiqueta: string;
  esBooleano?: boolean;
};

const CAMPOS_PERFIL: CampoPerfil[] = [
  { campo: 'nombre', etiqueta: 'nombre' },
  { campo: 'apellido', etiqueta: 'apellido' },
  { campo: 'telefono', etiqueta: 'teléfono' },
  { campo: 'cargoDocente', etiqueta: 'cargo' },
  { campo: 'tipoDesignacionDocente', etiqueta: 'tipo de designación' },
  { campo: 'genero', etiqueta: 'identidad de género' },
  { campo: 'areaDocente', etiqueta: 'materia/área' },
  { campo: 'personaConDiscapacidad', etiqueta: 'persona con discapacidad', esBooleano: true },
  { campo: 'direccionLocalidad', etiqueta: 'dirección o localidad' },
];

@Injectable()
export class ParticipacionConvocatoriaService {
  private readonly logger = new Logger(ParticipacionConvocatoriaService.name);

  constructor(
    @InjectRepository(ParticipacionConvocatoria)
    private readonly repo: Repository<ParticipacionConvocatoria>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    @InjectRepository(Notificacion)
    private readonly notificacionRepo: Repository<Notificacion>,
    private readonly auditoria: AuditoriaService,
    private readonly mail: MailService,
  ) {}

  async asignar(dto: CrearParticipacionDto, asignadoPor: Usuario): Promise<ParticipacionConvocatoria> {
    if (!this.esAutoridad(asignadoPor)) {
      await this.validarCreadorPuedeAsignar(asignadoPor, dto);
    }

    const usuario = await this.usuarioRepo.findOne({ where: { id: dto.usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (!usuario.roles.includes(RolUsuario.Docente)) {
      throw new BadRequestException('Solo usuarios con rol Docente pueden tener participaciones');
    }
    if (usuario.estadoValidacionDocente !== EstadoValidacionDocente.Validado) {
      throw new BadRequestException('El docente debe estar validado para ser asignado');
    }

    if (
      (dto.rol === RolEjecucion.DirectorDeProyecto || dto.rol === RolEjecucion.Evaluador) &&
      !this.perfilDocenteCompleto(usuario) &&
      this.esAutoridad(asignadoPor)
    ) {
      await this.completarPerfil(usuario, dto, asignadoPor);
    }

    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: dto.convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    const existentes = await this.repo.find({
      where: { usuarioId: dto.usuarioId, convocatoriaId: dto.convocatoriaId },
    });
    const { activas, estancadas } = await this.separarActivasYEstancadas(existentes);
    if (estancadas.length > 0) {
      await this.repo.remove(estancadas);
    }
    if (activas.length > 0) {
      throw new BadRequestException('El usuario ya tiene un rol asignado en esta convocatoria');
    }

    if (dto.rol === RolEjecucion.DirectorDeProyecto) {
      if (!dto.edicionId) {
        throw new BadRequestException('DirectorDeProyecto requiere una edicionId');
      }
      const edicion = await this.edicionRepo.findOne({ where: { id: dto.edicionId } });
      if (!edicion) throw new NotFoundException('Edicion no encontrada');

      const participacionesDirector = activas.filter(
        p => p.rol === RolEjecucion.DirectorDeProyecto,
      ).length;
      if (participacionesDirector >= 2) {
        throw new BadRequestException(
          'El usuario ya alcanzó el límite de 2 participaciones como director en esta convocatoria',
        );
      }
    }

    if (dto.rol === RolEjecucion.Evaluador) {
      if (dto.edicionId || dto.esDirectorPrincipal != null) {
        throw new BadRequestException('Evaluador no puede tener edicionId ni esDirectorPrincipal');
      }

      const esRectorado = asignadoPor.roles.includes(RolUsuario.AutoridadDeRectorado);
      if (!esRectorado) {
        throw new BadRequestException('Solo una Autoridad de Rectorado puede dar de alta evaluadores');
      }
      if (!usuario.unidadAcademicaId) {
        throw new BadRequestException('El docente debe pertenecer a una Unidad Académica');
      }

      const proyectosEnConvocatoria = await this.edicionRepo.count({
        where: { convocatoriaId: dto.convocatoriaId, creadoPorId: dto.usuarioId },
      });
      if (proyectosEnConvocatoria > 0) {
        throw new BadRequestException('El docente tiene proyectos en esta convocatoria y no puede ser evaluador');
      }

      const activos = await this.repo
        .createQueryBuilder('p')
        .innerJoin('p.usuario', 'u')
        .where('p.convocatoriaId = :convocatoriaId', { convocatoriaId: dto.convocatoriaId })
        .andWhere('p.rol = :rol', { rol: RolEjecucion.Evaluador })
        .andWhere('p.estado = :estado', { estado: EstadoPropuestaEvaluador.Aprobado })
        .andWhere('u.unidadAcademicaId = :uaId', { uaId: usuario.unidadAcademicaId })
        .getCount();

      if (activos >= CANTIDAD_EVALUADORES_POR_UA) {
        throw new BadRequestException(
          `La Unidad Académica ya alcanzó el límite de ${CANTIDAD_EVALUADORES_POR_UA} evaluadores en esta convocatoria`,
        );
      }
    }

    const entity = this.repo.create({
      usuarioId: dto.usuarioId,
      convocatoriaId: dto.convocatoriaId,
      rol: dto.rol,
      edicionId: dto.edicionId ?? null,
      esDirectorPrincipal: dto.esDirectorPrincipal ?? null,
      asignadoPorId: asignadoPor.id,
      estado: dto.rol === RolEjecucion.Evaluador
        ? EstadoPropuestaEvaluador.Aprobado
        : null,
    });

    const saved = await this.repo.save(entity);

    if (dto.rol === RolEjecucion.Evaluador) {
      await this.notificarDocenteAlta(usuario, convocatoria, saved.id);
      await this.auditoria.registrar({
        usuarioId: usuario.id,
        accion: TipoAccionAuditoria.PROPUESTA_EVALUADOR,
        descripcion: `Dado de alta como evaluador en la convocatoria "${convocatoria.nombre}"`,
        responsableId: asignadoPor.id,
        responsableNombre: asignadoPor.nombreCompleto,
      });
    }

    return saved;
  }

  private async notificarDocenteAlta(
    usuario: Usuario,
    convocatoria: Convocatoria,
    participacionId: string,
  ): Promise<void> {
    try {
      await this.mail.enviarAltaEvaluador(
        usuario.email,
        usuario.nombreCompleto,
        convocatoria.nombre,
      );
    } catch (err) {
      this.logger.error(
        `No se pudo enviar el mail de alta a ${usuario.email}: ${err instanceof Error ? err.message : err}`,
      );
    }

    try {
      await this.notificacionRepo.save(
        this.notificacionRepo.create({
          usuarioId: usuario.id,
          tipo: TipoNotificacion.RESULTADO_EVALUADOR,
          participacionId,
          mensaje: `Fuiste dado de alta como evaluador en la convocatoria "${convocatoria.nombre}"`,
        }),
      );
    } catch (err) {
      this.logger.error(
        `No se pudo crear la notificación de alta para ${usuario.email}: ${err instanceof Error ? err.message : err}`,
      );
    }
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

  private async validarCreadorPuedeAsignar(
    usuario: Usuario,
    dto: CrearParticipacionDto,
  ): Promise<void> {
    if (dto.rol !== RolEjecucion.DirectorDeProyecto) {
      throw new ForbiddenException('Solo autoridades pueden asignar otros roles');
    }
    if (!dto.edicionId) {
      throw new ForbiddenException('DirectorDeProyecto requiere una edicionId');
    }
    const edicion = await this.edicionRepo.findOne({ where: { id: dto.edicionId } });
    if (!edicion) throw new NotFoundException('Edicion no encontrada');
    if (edicion.creadoPorId !== usuario.id) {
      throw new ForbiddenException('Solo el creador de la edición o autoridades pueden asignar direcciones');
    }
    if (edicion.estado !== EstadoEdicion.Borrador) {
      throw new ForbiddenException('Solo se pueden asignar direcciones en estado borrador');
    }
  }

  private camposPerfilFaltantes(usuario: Usuario): CampoPerfil[] {
    return CAMPOS_PERFIL.filter(({ campo }) => {
      const valor = usuario[campo];
      return valor === null || valor === undefined || valor === '';
    });
  }

  private perfilDocenteCompleto(usuario: Usuario): boolean {
    return this.camposPerfilFaltantes(usuario).length === 0;
  }

  private async completarPerfil(
    usuario: Usuario,
    dto: CrearParticipacionDto,
    asignadoPor: Usuario,
  ): Promise<void> {
    const faltantes = this.camposPerfilFaltantes(usuario);
    const sinCompletar = faltantes.filter(({ campo }) => {
      const valor = dto[campo];
      if (campo === 'personaConDiscapacidad') {
        return typeof valor !== 'boolean';
      }
      return typeof valor !== 'string' || valor.trim() === '';
    });

    if (sinCompletar.length > 0) {
      const etiquetas = sinCompletar.map(({ etiqueta }) => etiqueta).join(', ');
      throw new BadRequestException(
        `Faltan completar los datos del perfil del docente: ${etiquetas}`,
      );
    }

    if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
    if (dto.apellido !== undefined) usuario.apellido = dto.apellido;
    if (dto.telefono !== undefined) usuario.telefono = dto.telefono;
    if (dto.genero !== undefined) usuario.genero = dto.genero;
    if (dto.personaConDiscapacidad !== undefined) {
      usuario.personaConDiscapacidad = dto.personaConDiscapacidad;
    }
    if (dto.cargoDocente !== undefined) usuario.cargoDocente = dto.cargoDocente;
    if (dto.tipoDesignacionDocente !== undefined) {
      usuario.tipoDesignacionDocente = dto.tipoDesignacionDocente;
    }
    if (dto.areaDocente !== undefined) usuario.areaDocente = dto.areaDocente;
    if (dto.direccionLocalidad !== undefined) {
      usuario.direccionLocalidad = dto.direccionLocalidad;
    }

    if (dto.nombre !== undefined || dto.apellido !== undefined) {
      usuario.nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
    }

    await this.usuarioRepo.save(usuario);

    const rolLabel = dto.rol === RolEjecucion.DirectorDeProyecto
      ? 'Director de Proyecto'
      : 'Evaluador';
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: `Perfil completado al asignar como ${rolLabel}`,
      responsableId: asignadoPor.id,
      responsableNombre: asignadoPor.nombreCompleto,
    });
  }

  async listarCandidatos(
    unidadAcademicaId: string,
    convocatoriaId: string,
    edicionId?: string,
    unidadAcademicaAdicionalId?: string,
    incluirBloqueados = false,
  ): Promise<(Usuario & { ocupado: boolean })[]> {
    if (!unidadAcademicaId) throw new BadRequestException('unidadAcademicaId es requerido');

    const unidadAcademicaIds = [
      unidadAcademicaId,
      ...(unidadAcademicaAdicionalId ? [unidadAcademicaAdicionalId] : []),
    ];

    const where: FindOptionsWhere<Usuario> = {
      unidadAcademicaId: In(unidadAcademicaIds),
    };
    if (!incluirBloqueados) where.habilitado = true;

    const usuarios = await this.usuarioRepo.find({
      where,
      relations: { unidadAcademica: true },
      select: {
        id: true,
        nombreCompleto: true,
        nombre: true,
        apellido: true,
        email: true,
        roles: true,
        telefono: true,
        genero: true,
        personaConDiscapacidad: true,
        cargoDocente: true,
        tipoDesignacionDocente: true,
        areaDocente: true,
        direccionLocalidad: true,
        estadoValidacionDocente: true,
        unidadAcademicaId: true,
        habilitado: true,
        unidadAcademica: { id: true, nombre: true },
      },
    });

    const participaciones = await this.repo.find({ where: { convocatoriaId } });
    const edicionIds = [...new Set(
      participaciones.map(p => p.edicionId).filter((id): id is string => !!id),
    )];
    const ediciones = edicionIds.length > 0
      ? await this.edicionRepo.find({ where: { id: In(edicionIds) }, withDeleted: true })
      : [];
    const edicionesEliminadas = new Set(
      ediciones.filter(e => e.eliminadoEn).map(e => e.id),
    );
    const usuarioIdsOcupados = new Set(
      participaciones
        .filter(p => {
          if (p.edicionId === edicionId) return false;
          if (!p.edicionId) return true;
          return !edicionesEliminadas.has(p.edicionId);
        })
        .map(p => p.usuarioId),
    );

    return usuarios
      .filter(u => u.roles.includes(RolUsuario.Docente))
      .filter(u =>
        incluirBloqueados ||
        (u.estadoValidacionDocente === EstadoValidacionDocente.Validado &&
          !usuarioIdsOcupados.has(u.id)),
      )
      .map(u => ({ ...u, ocupado: usuarioIdsOcupados.has(u.id) }));
  }

  private async separarActivasYEstancadas(
    participaciones: ParticipacionConvocatoria[],
  ): Promise<{ activas: ParticipacionConvocatoria[]; estancadas: ParticipacionConvocatoria[] }> {
    const conEdicion = participaciones.filter(p => p.edicionId);
    const edicionIds = [...new Set(conEdicion.map(p => p.edicionId as string))];
    const ediciones = edicionIds.length > 0
      ? await this.edicionRepo.find({ where: { id: In(edicionIds) }, withDeleted: true })
      : [];
    const eliminadas = new Set(ediciones.filter(e => e.eliminadoEn).map(e => e.id));
    return {
      activas: participaciones.filter(p => !p.edicionId || !eliminadas.has(p.edicionId)),
      estancadas: participaciones.filter(p => !!p.edicionId && eliminadas.has(p.edicionId)),
    };
  }

  async desasignar(id: string, usuario: Usuario): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Participacion no encontrada');

    if (
      entity.rol === RolEjecucion.Evaluador &&
      !usuario.roles.includes(RolUsuario.AutoridadDeRectorado)
    ) {
      throw new ForbiddenException('Solo una Autoridad de Rectorado puede dar de baja evaluadores');
    }

    if (!this.esAutoridad(usuario)) {
      const edicion = await this.edicionRepo.findOne({ where: { id: entity.edicionId ?? '' } });
      if (!edicion || edicion.creadoPorId !== usuario.id || edicion.estado !== EstadoEdicion.Borrador) {
        throw new ForbiddenException('Solo el creador de la edición o autoridades pueden desasignar');
      }
    }

    await this.notificacionRepo.delete({ participacionId: id });
    await this.repo.remove(entity);

    const convocatoria = entity.convocatoriaId
      ? await this.convocatoriaRepo.findOne({ where: { id: entity.convocatoriaId } })
      : null;
    const evaluador = await this.usuarioRepo.findOne({
      where: { id: entity.usuarioId },
      relations: { unidadAcademica: true },
    });
    const uaNombre = evaluador?.unidadAcademica?.nombre ?? 'la Unidad Académica';
    await this.auditoria.registrar({
      usuarioId: entity.usuarioId,
      accion: TipoAccionAuditoria.ELIMINACION_EVALUADOR,
      descripcion: `${uaNombre} lo quitó como evaluador de la convocatoria "${convocatoria?.nombre ?? ''}"`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
    });
  }

  async listarPorConvocatoria(convocatoriaId: string): Promise<ParticipacionConvocatoria[]> {
    return this.repo.find({
      where: { convocatoriaId },
      relations: { usuario: { unidadAcademica: true } },
      order: { creadoEn: 'ASC' },
    });
  }

  async listarPorUsuario(usuarioId: string): Promise<ParticipacionConvocatoria[]> {
    return this.repo.find({
      where: { usuarioId },
      relations: { convocatoria: true },
      order: { creadoEn: 'DESC' },
    });
  }

  async listarMias(usuarioId: string): Promise<ParticipacionConvocatoria[]> {
    return this.listarPorUsuario(usuarioId);
  }
}
