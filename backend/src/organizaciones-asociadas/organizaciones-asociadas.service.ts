import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizacionAsociada } from './organizacion-asociada.entity';
import {
  CrearOrganizacionAsociadaDto, ActualizarOrganizacionAsociadaDto,
} from './dto/organizacion-asociada.dto';
import { Edicion } from '../proyectos/edicion.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { TipoEntidadAuditoria } from '../common/enums/tipo-entidad-auditoria.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';

// Estados de la edición en los que la dirección puede editar la presentación (incluye las orgs).
const ESTADOS_EDITABLES = [EstadoEdicion.Borrador, EstadoEdicion.PendienteDeCambios];

@Injectable()
export class OrganizacionesAsociadasService {
  constructor(
    @InjectRepository(OrganizacionAsociada)
    private readonly repo: Repository<OrganizacionAsociada>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly participacionRepo: Repository<ParticipacionConvocatoria>,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(edicionId: string, usuario: Usuario): Promise<OrganizacionAsociada[]> {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarAccesoLectura(edicion, usuario);
    return this.repo.find({ where: { edicionId }, order: { creadoEn: 'ASC' } });
  }

  async crear(
    edicionId: string,
    dto: CrearOrganizacionAsociadaDto,
    usuario: Usuario,
  ): Promise<OrganizacionAsociada> {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEditable(edicion);

    const organizacion = await this.repo.save(
      this.repo.create({ ...dto, edicionId, creadoPorId: usuario.id }),
    );

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.CREACION,
      descripcion: `Agregó la organización asociada "${organizacion.nombre}"`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.ORGANIZACION_ASOCIADA,
      entidadId: organizacion.id,
    });

    return organizacion;
  }

  async actualizar(
    id: string,
    dto: ActualizarOrganizacionAsociadaDto,
    usuario: Usuario,
  ): Promise<OrganizacionAsociada> {
    const organizacion = await this.obtener(id);
    const edicion = await this.obtenerEdicion(organizacion.edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEditable(edicion);

    for (const [clave, valor] of Object.entries(dto)) {
      if (valor !== undefined) (organizacion as unknown as Record<string, unknown>)[clave] = valor;
    }
    const guardada = await this.repo.save(organizacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: `Modificó la organización asociada "${guardada.nombre}"`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.ORGANIZACION_ASOCIADA,
      entidadId: guardada.id,
    });

    return guardada;
  }

  async eliminar(id: string, usuario: Usuario): Promise<void> {
    const organizacion = await this.obtener(id);
    const edicion = await this.obtenerEdicion(organizacion.edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEditable(edicion);

    await this.repo.softRemove(organizacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: `Eliminó la organización asociada "${organizacion.nombre}"`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.ORGANIZACION_ASOCIADA,
      entidadId: organizacion.id,
    });
  }

  // ───────────── Helpers ─────────────

  private async obtener(id: string): Promise<OrganizacionAsociada> {
    const organizacion = await this.repo.findOne({ where: { id } });
    if (!organizacion) throw new NotFoundException('Organización asociada no encontrada');
    return organizacion;
  }

  private async obtenerEdicion(id: string): Promise<Edicion> {
    const edicion = await this.edicionRepo.findOne({ where: { id } });
    if (!edicion) throw new NotFoundException('Edición no encontrada');
    return edicion;
  }

  private esRectorado(usuario: Usuario): boolean {
    return usuario.roles.some(
      r => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
    );
  }

  private esSecretaria(usuario: Usuario): boolean {
    return usuario.roles.some(
      r => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
    );
  }

  /** Escritura: solo el creador o un director de la edición. */
  private async validarDirectorOCreador(edicion: Edicion, usuario: Usuario): Promise<void> {
    if (edicion.creadoPorId === usuario.id) return;
    const esDirector = await this.participacionRepo.findOneBy({
      edicionId: edicion.id,
      usuarioId: usuario.id,
      rol: RolEjecucion.DirectorDeProyecto,
    });
    if (!esDirector) {
      throw new ForbiddenException('Solo el creador o director del proyecto puede realizar esta acción');
    }
  }

  /** Lectura: creador/director, Secretaría de la misma UA o Rectorado. */
  private async validarAccesoLectura(edicion: Edicion, usuario: Usuario): Promise<void> {
    if (this.esRectorado(usuario)) return;
    if (this.esSecretaria(usuario) && usuario.unidadAcademicaId === edicion.unidadAcademicaId) return;
    if (edicion.creadoPorId === usuario.id) return;
    const esDirector = await this.participacionRepo.findOneBy({
      edicionId: edicion.id,
      usuarioId: usuario.id,
      rol: RolEjecucion.DirectorDeProyecto,
    });
    if (esDirector) return;
    throw new ForbiddenException('No tenés acceso a las organizaciones de esta edición');
  }

  private validarEditable(edicion: Edicion): void {
    if (!ESTADOS_EDITABLES.includes(edicion.estado)) {
      throw new BadRequestException(
        'Las organizaciones asociadas solo se editan mientras el proyecto está en borrador o pendiente de cambios',
      );
    }
  }
}
