import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParticipacionConvocatoria } from './participacion-convocatoria.entity';
import { CrearParticipacionDto } from './dto/crear-participacion.dto';
import { ActualizarEstadoParticipacionDto } from './dto/actualizar-estado-participacion.dto';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { EstadoPropuestaEvaluador } from '../common/enums/estado-propuesta-evaluador.enum';
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
  constructor(
    @InjectRepository(ParticipacionConvocatoria)
    private readonly repo: Repository<ParticipacionConvocatoria>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    private readonly auditoria: AuditoriaService,
  ) {}

  async asignar(dto: CrearParticipacionDto, asignadoPor: Usuario): Promise<ParticipacionConvocatoria> {
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
      !this.perfilDocenteCompleto(usuario)
    ) {
      await this.completarPerfil(usuario, dto, asignadoPor);
    }

    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: dto.convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    const existente = await this.repo.findOne({
      where: { usuarioId: dto.usuarioId, convocatoriaId: dto.convocatoriaId },
    });
    if (existente) {
      throw new BadRequestException('El usuario ya tiene un rol asignado en esta convocatoria');
    }

    if (dto.rol === RolEjecucion.DirectorDeProyecto) {
      if (!dto.edicionId) {
        throw new BadRequestException('DirectorDeProyecto requiere una edicionId');
      }
      const edicion = await this.edicionRepo.findOne({ where: { id: dto.edicionId } });
      if (!edicion) throw new NotFoundException('Edicion no encontrada');

      const participacionesDirector = await this.repo.count({
        where: {
          usuarioId: dto.usuarioId,
          convocatoriaId: dto.convocatoriaId,
          rol: RolEjecucion.DirectorDeProyecto,
        },
      });
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

      const esSecretaria = asignadoPor.roles.some(
        r => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
      );
      if (!esSecretaria) {
        throw new BadRequestException('Solo la Secretaría de la Unidad Académica puede proponer evaluadores');
      }
      if (!asignadoPor.unidadAcademicaId) {
        throw new BadRequestException('La Secretaría debe pertenecer a una Unidad Académica');
      }
      if (usuario.unidadAcademicaId !== asignadoPor.unidadAcademicaId) {
        throw new BadRequestException('Solo se pueden proponer docentes de la propia Unidad Académica');
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
        .andWhere('p.estado IN (:...estados)', {
          estados: [EstadoPropuestaEvaluador.Propuesto, EstadoPropuestaEvaluador.Aprobado],
        })
        .andWhere('u.unidadAcademicaId = :uaId', { uaId: asignadoPor.unidadAcademicaId })
        .getCount();

      if (activos >= CANTIDAD_EVALUADORES_POR_UA) {
        throw new BadRequestException(
          `La Unidad Académica ya alcanzó el límite de ${CANTIDAD_EVALUADORES_POR_UA} evaluadores activos en esta convocatoria`,
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
        ? EstadoPropuestaEvaluador.Propuesto
        : null,
    });

    return this.repo.save(entity);
  }

  async actualizarEstado(id: string, dto: ActualizarEstadoParticipacionDto): Promise<ParticipacionConvocatoria> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Participacion no encontrada');
    if (entity.rol !== RolEjecucion.Evaluador) {
      throw new BadRequestException('Solo las participaciones de evaluador pueden aprobarse o rechazarse');
    }
    if (entity.estado !== EstadoPropuestaEvaluador.Propuesto) {
      throw new BadRequestException('Solo las propuestas pendientes pueden aprobarse o rechazarse');
    }
    entity.estado = dto.estado;
    return this.repo.save(entity);
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

  async desasignar(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Participacion no encontrada');
    await this.repo.remove(entity);
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
