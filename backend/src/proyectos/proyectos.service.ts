import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Edicion } from './edicion.entity';
import { CrearProyectoDto } from './dto/crear-proyecto.dto';
import { ActualizarEdicionDto } from './dto/actualizar-edicion.dto';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoDirector } from '../common/enums/estado-director.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly proyectoRepo: Repository<Proyecto>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
  ) {}

  async crearProyecto(dto: CrearProyectoDto, usuario: Usuario) {
    this.validarDirectorHabilitado(usuario);

    const convocatoriaId = dto.convocatoriaId || null;

    if (dto.convocatoriaId) {
      await this.validarConvocatoriaPresentacion(dto.convocatoriaId);
      await this.validarLimiteParticipaciones(usuario.id, dto.convocatoriaId);
    }

    if (dto.codirectorId) {
      await this.validarCodirector(dto.codirectorId, convocatoriaId, usuario.id);
    }

    const proyecto = await this.proyectoRepo.save(
      this.proyectoRepo.create({
        nombre: dto.nombre,
        creadoPorId: usuario.id,
      }),
    );

    await this.edicionRepo.save(
      this.edicionRepo.create({
        proyectoId: proyecto.id,
        convocatoriaId,
        estado: EstadoEdicion.Borrador,
        directorId: usuario.id,
        codirectorId: dto.codirectorId || null,
        unidadAcademicaId: usuario.unidadAcademicaId,
        presupuesto: dto.presupuesto || null,
      }),
    );

    return this.obtenerProyecto(proyecto.id);
  }

  async listar(usuario: Usuario, convocatoriaId?: string) {
    const esDirector = usuario.roles.includes(RolUsuario.DirectorDeProyecto);

    const query = this.edicionRepo.createQueryBuilder('edicion')
      .leftJoinAndSelect('edicion.proyecto', 'proyecto')
      .leftJoinAndSelect('edicion.director', 'director')
      .leftJoinAndSelect('edicion.codirector', 'codirector')
      .leftJoinAndSelect('edicion.unidadAcademica', 'unidadAcademica')
      .leftJoinAndSelect('edicion.convocatoria', 'convocatoria')
      .orderBy('edicion.actualizadoEn', 'DESC');

    if (esDirector) {
      query.andWhere('(edicion.directorId = :userId OR edicion.codirectorId = :userId)', { userId: usuario.id });
    }

    if (convocatoriaId) {
      query.andWhere('edicion.convocatoriaId = :convId', { convId: convocatoriaId });
    }

    return query.getMany();
  }

  async obtenerProyecto(id: string) {
    const proyecto = await this.proyectoRepo.findOne({
      where: { id },
      relations: { creadoPor: true },
    });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const ediciones = await this.edicionRepo.find({
      where: { proyectoId: id },
      relations: {
        director: true,
        codirector: true,
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

    this.validarPropietarioEdicion(edicion, usuario.id);
    this.validarEstadoEditable(edicion);

    if (dto.nombre !== undefined) {
      await this.proyectoRepo.update(proyectoId, { nombre: dto.nombre });
    }

    if (dto.codirectorId !== undefined) {
      if (dto.codirectorId) {
        await this.validarCodirector(dto.codirectorId, edicion.convocatoriaId, edicion.directorId);
      }
      edicion.codirectorId = dto.codirectorId || null;
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

    this.validarPropietarioEdicion(edicion, usuario.id);
    this.validarEstadoEditable(edicion);

    edicion.estado = EstadoEdicion.Presentado;
    await this.edicionRepo.save(edicion);

    return this.obtenerProyecto(proyectoId);
  }

  private async obtenerEdicion(proyectoId: string, edicionId: string): Promise<Edicion> {
    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId, proyectoId },
      relations: {
        director: true,
        codirector: true,
        unidadAcademica: true,
        convocatoria: true,
        proyecto: true,
      },
    });
    if (!edicion) throw new NotFoundException('Edicion no encontrada');
    return edicion;
  }

  private validarDirectorHabilitado(usuario: Usuario) {
    if (!usuario.roles.includes(RolUsuario.DirectorDeProyecto)) {
      throw new ForbiddenException('El usuario no tiene rol DirectorDeProyecto');
    }
    if (usuario.estadoDirector !== EstadoDirector.Validado) {
      throw new ForbiddenException(
        'El director debe estar validado por la Secretaría de su UA para crear proyectos',
      );
    }
    if (!usuario.unidadAcademicaId) {
      throw new BadRequestException('El director debe pertenecer a una Unidad Académica');
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

  private async validarLimiteParticipaciones(usuarioId: string, convocatoriaId: string) {
    const comoDirector = await this.edicionRepo.count({
      where: { directorId: usuarioId, convocatoriaId },
    });
    const comoCodirector = await this.edicionRepo.count({
      where: { codirectorId: usuarioId, convocatoriaId },
    });

    if (comoDirector >= 1) {
      throw new BadRequestException(
        'Ya sos director de un proyecto en esta convocatoria. Máximo 1 proyecto como director.',
      );
    }
    if (comoDirector + comoCodirector >= 2) {
      throw new BadRequestException(
        'Alcanzaste el límite de 2 participaciones por convocatoria (1 como director + 1 como codirector)',
      );
    }
  }

  private async validarCodirector(
    codirectorId: string, convocatoriaId: string | null, directorId: string,
  ) {
    if (codirectorId === directorId) {
      throw new BadRequestException('El codirector no puede ser el mismo que el director');
    }

    const codirector = await this.edicionRepo.manager.findOne(Usuario, {
      where: { id: codirectorId },
    });
    if (!codirector) throw new NotFoundException('Codirector no encontrado');
    if (!codirector.roles.includes(RolUsuario.DirectorDeProyecto)) {
      throw new BadRequestException('El codirector debe tener rol DirectorDeProyecto');
    }
    if (codirector.estadoDirector !== EstadoDirector.Validado) {
      throw new BadRequestException('El codirector debe estar validado');
    }

    if (convocatoriaId) {
      const participaciones = await this.edicionRepo.count({
        where: [
          { directorId: codirectorId, convocatoriaId },
          { codirectorId: codirectorId, convocatoriaId },
        ],
      });
      if (participaciones >= 2) {
        throw new BadRequestException('El codirector ya alcanzó el límite de 2 participaciones en esta convocatoria');
      }
    }
  }

  private validarPropietarioEdicion(edicion: Edicion, usuarioId: string) {
    if (edicion.directorId !== usuarioId && edicion.codirectorId !== usuarioId) {
      throw new ForbiddenException('No tenés permisos sobre esta edición');
    }
  }

  private validarEstadoEditable(edicion: Edicion) {
    if (edicion.estado !== EstadoEdicion.Borrador) {
      throw new BadRequestException(
        `No se puede modificar una edición en estado ${edicion.estado}`,
      );
    }
  }
}
