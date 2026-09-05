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
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { TipoEntidadAuditoria } from '../common/enums/tipo-entidad-auditoria.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Notificacion } from '../sugerencias/notificacion.entity';

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
    @InjectRepository(Notificacion)
    private readonly notificacionRepo: Repository<Notificacion>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
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
      relations: { convocatoria: true, proyecto: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');
    return edicion;
  }

  private async validarEtapaEjecucion(edicion: Edicion): Promise<void> {
    if (edicion.estado !== EstadoEdicion.EnEjecucion) {
      throw new BadRequestException(
        this.motivoBloqueoComprobantes(edicion),
      );
    }
    if (edicion.convocatoria?.estado !== EstadoConvocatoria.Ejecucion) {
      throw new BadRequestException(
        this.motivoBloqueoComprobantes(edicion),
      );
    }
  }

  /** Explica por qué no se pueden gestionar comprobantes (edición o convocatoria cerrada). */
  private motivoBloqueoComprobantes(edicion: Edicion): string {
    if (edicion.estado === EstadoEdicion.Cerrado) {
      return 'La edición está cerrada; no se pueden gestionar comprobantes';
    }
    if (edicion.convocatoria?.estado === EstadoConvocatoria.Cierre) {
      return 'La convocatoria está cerrada; no se pueden gestionar comprobantes';
    }
    return 'El proyecto no está en etapa de ejecución';
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

  /** Lectura: director/creador, Secretaría de la misma UA (solo si el director la habilitó) o Rectorado. */
  private async validarAccesoLectura(edicion: Edicion, usuario: Usuario): Promise<void> {
    if (this.esRectorado(usuario)) return;
    if (
      this.esSecretaria(usuario) &&
      usuario.unidadAcademicaId === edicion.unidadAcademicaId &&
      edicion.uaPuedeVerComprobantes
    ) {
      return;
    }
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
   * Destinatarios de gestión de comprobantes: solo Rectorado (todas las UAs).
   * La Unidad Académica no participa de la gestión de comprobantes. Excluye al autor.
   */
  private async resolverDestinatariosGestion(edicion: Edicion, excluirId: string): Promise<Usuario[]> {
    const usuarios = await this.usuarioRepo
      .createQueryBuilder('u')
      .where('u.habilitado = :habilitado', { habilitado: true })
      .andWhere('u.roles LIKE :rectorado', { rectorado: '%Rectorado%' })
      .getMany();
    return usuarios.filter(u => u.id !== excluirId);
  }

  private async notificarGestion(
    edicion: Edicion,
    rendicion: Rendicion,
    tipo: TipoNotificacion,
    mensaje: string,
    excluirId: string,
  ): Promise<void> {
    const destinatarios = await this.resolverDestinatariosGestion(edicion, excluirId);
    for (const d of destinatarios) {
      await this.notificacionRepo.save(
        this.notificacionRepo.create({ usuarioId: d.id, tipo, mensaje, rendicionId: rendicion.id }),
      );
    }
  }

  private async notificarAutor(
    rendicion: Rendicion,
    tipo: TipoNotificacion,
    mensaje: string,
    autorId: string | null,
  ): Promise<void> {
    if (!autorId) return;
    await this.notificacionRepo.save(
      this.notificacionRepo.create({ usuarioId: autorId, tipo, mensaje, rendicionId: rendicion.id }),
    );
  }

  /**
   * Notifica al director y codirector del proyecto cuando se acepta o rechaza un comprobante.
   */
  private async notificarDirectores(
    edicion: Edicion,
    rendicion: Rendicion,
    tipo: TipoNotificacion,
    mensaje: string,
    excluirId: string,
  ): Promise<void> {
    const directores = await this.participacionRepo.find({
      where: { edicionId: edicion.id, rol: RolEjecucion.DirectorDeProyecto },
      relations: { usuario: true },
    });
    for (const d of directores) {
      if (!d.usuario || d.usuarioId === excluirId) continue;
      await this.notificacionRepo.save(
        this.notificacionRepo.create({ usuarioId: d.usuarioId, tipo, mensaje, rendicionId: rendicion.id }),
      );
    }
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

    const proyectoNombre = edicion.proyecto?.nombre ?? 'el proyecto';
    await this.notificarGestion(
      edicion,
      guardado,
      TipoNotificacion.NUEVO_COMPROBANTE,
      `${usuario.nombreCompleto} cargó un comprobante de $${dto.monto.toLocaleString('es-AR')} (${dto.rubro}) en el proyecto "${proyectoNombre}"`,
      usuario.id,
    );

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

    // Cambio de estado (aceptar/rechazar): solo Rectorado.
    if (dto.estado !== undefined) {
      const esGestion = this.esRectorado(usuario);
      if (!esGestion) {
        throw new ForbiddenException('Solo el Rectorado puede aceptar o rechazar comprobantes');
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
      const estadoPrevio = rendicion.estado;
      rendicion.estado = dto.estado;
      await this.repo.save(rendicion);

      const proyectoNombre = edicion.proyecto?.nombre ?? 'el proyecto';
      if (estadoPrevio !== dto.estado) {
        if (dto.estado === EstadoComprobante.Aceptado) {
          const msg = `${usuario.nombreCompleto} aceptó tu comprobante de $${rendicion.monto.toLocaleString('es-AR')} (${rendicion.rubro}) en el proyecto "${proyectoNombre}"`;
          await this.notificarAutor(rendicion, TipoNotificacion.COMPROBANTE_ACEPTADO, msg, rendicion.creadoPorId);
          await this.notificarDirectores(edicion, rendicion, TipoNotificacion.COMPROBANTE_ACEPTADO, msg, rendicion.creadoPorId);
        } else if (dto.estado === EstadoComprobante.Rechazado) {
          const msg = `${usuario.nombreCompleto} rechazó tu comprobante de $${rendicion.monto.toLocaleString('es-AR')} (${rendicion.rubro}) en el proyecto "${proyectoNombre}". Motivo: ${rendicion.motivoRechazo}`;
          await this.notificarAutor(rendicion, TipoNotificacion.COMPROBANTE_RECHAZADO, msg, rendicion.creadoPorId);
          await this.notificarDirectores(edicion, rendicion, TipoNotificacion.COMPROBANTE_RECHAZADO, msg, rendicion.creadoPorId);
        }
      }
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
    const estabaRechazado = rendicion.estado === EstadoComprobante.Rechazado;
    rendicion.estado = EstadoComprobante.EnRevision;
    rendicion.motivoRechazo = null;

    const guardado = await this.repo.save(rendicion);

    if (estabaRechazado) {
      const proyectoNombre = edicion.proyecto?.nombre ?? 'el proyecto';
      await this.notificarGestion(
        edicion,
        guardado,
        TipoNotificacion.NUEVO_COMPROBANTE,
        `${usuario.nombreCompleto} corrigió el comprobante de $${guardado.monto.toLocaleString('es-AR')} (${guardado.rubro}) en el proyecto "${proyectoNombre}"`,
        usuario.id,
      );
    }

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
