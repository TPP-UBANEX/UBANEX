import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParticipacionConvocatoria } from './participacion-convocatoria.entity';
import { CrearParticipacionDto } from './dto/crear-participacion.dto';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';

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
    }

    const entity = this.repo.create({
      usuarioId: dto.usuarioId,
      convocatoriaId: dto.convocatoriaId,
      rol: dto.rol,
      edicionId: dto.edicionId ?? null,
      esDirectorPrincipal: dto.esDirectorPrincipal ?? null,
      asignadoPorId: asignadoPor.id,
    });

    return this.repo.save(entity);
  }

  async desasignar(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Participacion no encontrada');
    await this.repo.remove(entity);
  }

  async listarPorConvocatoria(convocatoriaId: string): Promise<ParticipacionConvocatoria[]> {
    return this.repo.find({
      where: { convocatoriaId },
      relations: { usuario: true },
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
