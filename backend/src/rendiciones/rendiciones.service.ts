import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rendicion } from './rendicion.entity';
import { CrearRendicionDto } from './dto/crear-rendicion.dto';
import { ActualizarRendicionDto } from './dto/actualizar-rendicion.dto';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoComprobante } from '../common/enums/estado-comprobante.enum';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { TipoEntidadAuditoria } from '../common/enums/tipo-entidad-auditoria.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class RendicionesService {
  constructor(
    @InjectRepository(Rendicion)
    private readonly repo: Repository<Rendicion>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly participacionRepo: Repository<ParticipacionConvocatoria>,
    private readonly auditoria: AuditoriaService,
  ) {}

  private esRectorado(usuario: Usuario): boolean {
    return usuario.roles.some(r =>
      r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
    );
  }

  private esSecretaria(usuario: Usuario): boolean {
    return usuario.roles.some(r =>
      r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
    );
  }

  private async obtenerEdicion(edicionId: string): Promise<Edicion> {
    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId },
      relations: { convocatoria: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');
    return edicion;
  }

  private async validarEtapaEjecucion(edicion: Edicion): Promise<void> {
    const esEjecucionOCierre =
      edicion.estado === EstadoEdicion.EnEjecucion || edicion.estado === EstadoEdicion.Cerrado;
    const convocatoriaEnEjecucion =
      edicion.convocatoria?.estado === EstadoConvocatoria.Ejecucion ||
      edicion.convocatoria?.estado === EstadoConvocatoria.Cierre;
    if (!esEjecucionOCierre) {
      throw new BadRequestException('El proyecto no está en etapa de ejecución');
    }
    if (!convocatoriaEnEjecucion) {
      throw new BadRequestException('La convocatoria no está en etapa de ejecución');
    }
  }

  /** El usuario debe ser creador o director del proyecto (acceso de escritura). */
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

  /** Lectura: director/creador, Secretaría de la misma UA o Rectorado. */
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
    throw new ForbiddenException('No tenés acceso a los comprobantes de esta edición');
  }

  /**
   * Valida que un comprobante (nuevo o editado) no exceda el presupuesto solicitado de la edición.
   * - El rubro debe existir en el presupuesto.
   * - La suma por rubro (EnRevisión + Aceptados) no puede superar el subtotal del rubro.
   * - La suma total no puede superar el montoTotal del presupuesto.
   * Los comprobantes Rechazados no cuentan. Si `idExcluido` se pasa (edición), ese comprobante
   * se descuenta antes de recalcular; `rubro`/`monto` representan el valor final editado.
   * Si `yaIncluido` es true, el comprobante objetivo ya está contado en la suma (ej. aceptar un
   * comprobante en revisión) y solo se recalculan los topes sin volver a sumarlo.
   */
  private async validarPresupuesto(
    edicion: Edicion,
    overrides: { idExcluido?: string; rubro: TipoRubro; monto?: number; yaIncluido?: boolean },
  ): Promise<void> {
    const presupuesto = edicion.presupuestoSolicitado;
    if (!presupuesto || !Array.isArray(presupuesto.rubros) || presupuesto.rubros.length === 0) {
      throw new BadRequestException(
        'No se pueden cargar comprobantes: el proyecto no tiene un presupuesto definido',
      );
    }

    const rubroObjetivo = overrides.rubro;
    const rubroPresupuestado = presupuesto.rubros.find((r) => r.tipo === rubroObjetivo);
    if (!rubroPresupuestado) {
      throw new BadRequestException(
        'El rubro seleccionado no existe en el presupuesto del proyecto',
      );
    }

    const actuales = await this.repo.find({ where: { edicionId: edicion.id } });
    const cuenta = actuales.filter(
      (r) => r.estado !== EstadoComprobante.Rechazado && r.id !== overrides.idExcluido,
    );

    const sumaPorRubro: Record<string, number> = {};
    let sumaTotal = 0;
    for (const r of cuenta) {
      sumaPorRubro[r.rubro] = (sumaPorRubro[r.rubro] ?? 0) + Number(r.monto);
      sumaTotal += Number(r.monto);
    }

    // Sumo el valor del comprobante objetivo (nuevo o editado) salvo que ya esté contado.
    if (!overrides.yaIncluido) {
      const montoObjetivo = overrides.monto ? Number(overrides.monto) : 0;
      if (montoObjetivo > 0) {
        sumaPorRubro[rubroObjetivo] = (sumaPorRubro[rubroObjetivo] ?? 0) + montoObjetivo;
        sumaTotal += montoObjetivo;
      }
    }

    if (sumaTotal > Number(presupuesto.montoTotal)) {
      throw new BadRequestException(
        `La suma de los comprobantes (${sumaTotal.toLocaleString('es-AR')}) supera el presupuesto total del proyecto (${Number(presupuesto.montoTotal).toLocaleString('es-AR')})`,
      );
    }

    const subtotalRubro = Number(rubroPresupuestado.subtotal);
    if (sumaPorRubro[rubroObjetivo] > subtotalRubro) {
      throw new BadRequestException(
        `Los comprobantes del rubro superan el presupuesto asignado a ese rubro (${subtotalRubro.toLocaleString('es-AR')})`,
      );
    }
  }

  /** Valida que la fecha del comprobante esté dentro del período de ejecución de la convocatoria. */
  private validarFechaEnEjecucion(edicion: Edicion, fecha: string): void {
    const { fechaInicioEjecucion, fechaFinEjecucion } = edicion.convocatoria ?? {};
    if (fechaInicioEjecucion && fecha < fechaInicioEjecucion) {
      throw new BadRequestException(
        'La fecha del comprobante debe ser posterior o igual al inicio del período de ejecución',
      );
    }
    if (fechaFinEjecucion && fecha > fechaFinEjecucion) {
      throw new BadRequestException(
        'La fecha del comprobante debe ser anterior o igual al fin del período de ejecución',
      );
    }
  }

  /** Normaliza el link (agrega https:// si falta) y valida que sea de Google Drive. */
  private validarLinkGoogleDrive(url: string): string {
    const v = url.trim();
    if (!v) {
      throw new BadRequestException('El link al comprobante es obligatorio');
    }
    const normalizado = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    let host: string;
    try {
      host = new URL(normalizado).hostname.toLowerCase();
    } catch {
      throw new BadRequestException('El link al comprobante no es una URL válida');
    }
    const permitidos = ['drive.google.com', 'drive.usercontent.google.com', 'docs.google.com'];
    if (!permitidos.some((d) => host === d || host.endsWith(`.${d}`))) {
      throw new BadRequestException(
        'El link al comprobante debe ser de Google Drive (drive.google.com, docs.google.com o drive.usercontent.google.com)',
      );
    }
    return normalizado;
  }

  async listarPorEdicion(edicionId: string, usuario: Usuario): Promise<Rendicion[]> {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarAccesoLectura(edicion, usuario);
    return this.repo.find({
      where: { edicionId },
      relations: { creadoPor: true },
      order: { creadoEn: 'DESC' },
    });
  }

  async crear(dto: CrearRendicionDto, usuario: Usuario): Promise<Rendicion> {
    const edicion = await this.obtenerEdicion(dto.edicionId);
    await this.validarEtapaEjecucion(edicion);
    await this.validarDirectorOCreador(edicion, usuario);
    await this.validarPresupuesto(edicion, { rubro: dto.rubro, monto: dto.monto });
    await this.validarFechaEnEjecucion(edicion, dto.fecha);

    const rendicion = this.repo.create({
      edicionId: edicion.id,
      rubro: dto.rubro,
      monto: dto.monto,
      descripcion: dto.descripcion ?? null,
      fecha: dto.fecha,
      comprobanteUrl: this.validarLinkGoogleDrive(dto.comprobanteUrl),
      motivoRechazo: null,
      estado: EstadoComprobante.EnRevision,
      creadoPorId: usuario.id,
    });
    const guardado = await this.repo.save(rendicion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.CREACION,
      descripcion: `Se cargó un comprobante de gasto en la edición ${edicion.id}`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.RENDICION,
      entidadId: guardado.id,
    });

    return guardado;
  }

  async actualizar(id: string, dto: ActualizarRendicionDto, usuario: Usuario): Promise<Rendicion> {
    const rendicion = await this.repo.findOneBy({ id });
    if (!rendicion) throw new NotFoundException('Comprobante no encontrado');
    const edicion = await this.obtenerEdicion(rendicion.edicionId);

    // Cambio de estado (aceptar/rechazar): solo Secretaría de la misma UA o Rectorado.
    if (dto.estado !== undefined) {
      const esGestion = this.esRectorado(usuario) ||
        (this.esSecretaria(usuario) && usuario.unidadAcademicaId === edicion.unidadAcademicaId);
      if (!esGestion) {
        throw new ForbiddenException('Solo la Secretaría o el Rectorado pueden cambiar el estado del comprobante');
      }
      if (dto.estado === EstadoComprobante.Aceptado) {
        // Si venía en revisión o aprobado ya cuenta en la suma; si estaba rechazado, aceptarlo lo agrega.
        const yaIncluido = rendicion.estado !== EstadoComprobante.Rechazado;
        await this.validarPresupuesto(edicion, { rubro: rendicion.rubro, monto: rendicion.monto, yaIncluido });
      }
      if (dto.estado === EstadoComprobante.Rechazado) {
        const motivo = dto.motivoRechazo?.trim();
        if (!motivo) {
          throw new BadRequestException('Debés indicar un motivo para rechazar el comprobante');
        }
        rendicion.motivoRechazo = motivo;
      } else if (dto.estado === EstadoComprobante.Aceptado) {
        rendicion.motivoRechazo = null;
      }
      rendicion.estado = dto.estado;
      await this.repo.save(rendicion);
      return rendicion;
    }

    // Edición de campos: solo director/creador, en etapa de ejecución y si no fue aceptado.
    await this.validarEtapaEjecucion(edicion);
    await this.validarDirectorOCreador(edicion, usuario);
    if (rendicion.estado === EstadoComprobante.Aceptado) {
      throw new BadRequestException('No se puede editar un comprobante aprobado');
    }

    const nuevoRubro = dto.rubro ?? rendicion.rubro;
    const nuevoMonto = dto.monto ?? rendicion.monto;
    await this.validarPresupuesto(edicion, {
      idExcluido: rendicion.id,
      rubro: nuevoRubro,
      monto: nuevoMonto,
    });
    if (dto.fecha !== undefined) {
      await this.validarFechaEnEjecucion(edicion, dto.fecha);
    }

    if (dto.rubro !== undefined) rendicion.rubro = dto.rubro;
    if (dto.monto !== undefined) rendicion.monto = dto.monto;
    if (dto.descripcion !== undefined) rendicion.descripcion = dto.descripcion;
    if (dto.fecha !== undefined) rendicion.fecha = dto.fecha;
    if (dto.comprobanteUrl !== undefined) {
      rendicion.comprobanteUrl = this.validarLinkGoogleDrive(dto.comprobanteUrl);
    }
    // Si estaba rechazado y el director lo vuelve a editar, pasa nuevamente a EnRevisión
    // y se limpia el motivo de rechazo.
    rendicion.estado = EstadoComprobante.EnRevision;
    rendicion.motivoRechazo = null;

    const guardado = await this.repo.save(rendicion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: `Se actualizó el comprobante ${id} de la edición ${edicion.id}`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.RENDICION,
      entidadId: guardado.id,
    });

    return guardado;
  }

  async eliminar(id: string, usuario: Usuario): Promise<{ message: string }> {
    const rendicion = await this.repo.findOneBy({ id });
    if (!rendicion) throw new NotFoundException('Comprobante no encontrado');
    const edicion = await this.obtenerEdicion(rendicion.edicionId);

    await this.validarEtapaEjecucion(edicion);
    await this.validarDirectorOCreador(edicion, usuario);
    if (rendicion.estado === EstadoComprobante.Aceptado) {
      throw new BadRequestException('No se puede eliminar un comprobante aprobado');
    }

    await this.repo.delete(id);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.ELIMINACION,
      descripcion: `Se eliminó el comprobante ${id} de la edición ${edicion.id}`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.RENDICION,
      entidadId: id,
    });

    return { message: 'Comprobante eliminado' };
  }
}
