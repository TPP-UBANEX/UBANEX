import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hito } from './hito.entity';
import { AutoevaluacionImpacto } from './autoevaluacion-impacto.entity';
import { InformeFinal } from './informe-final.entity';
import { TemplateAutoevaluacionImpacto } from './template-autoevaluacion.entity';
import { CrearHitoDto, ActualizarHitoDto } from './dto/hito.dto';
import { GuardarAutoevaluacionDto, GuardarInformeFinalDto } from './dto/ejecucion.dto';
import { GuardarTemplateAutoevaluacionDto } from './dto/guardar-template-autoevaluacion.dto';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoAutoevaluacion } from '../common/enums/estado-autoevaluacion.enum';
import { EstadoInforme } from '../common/enums/estado-informe.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { TipoEntidadAuditoria } from '../common/enums/tipo-entidad-auditoria.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { validarEstructuraAutoevaluacion } from '../common/dto/validador-estructura-autoevaluacion';
import { validarRespuestasAutoevaluacion, preguntasObligatoriasFaltantes } from '../evaluaciones/validar-respuestas-autoevaluacion';

@Injectable()
export class EjecucionService {
  constructor(
    @InjectRepository(Hito)
    private readonly hitoRepo: Repository<Hito>,
    @InjectRepository(AutoevaluacionImpacto)
    private readonly autoevaluacionRepo: Repository<AutoevaluacionImpacto>,
    @InjectRepository(InformeFinal)
    private readonly informeRepo: Repository<InformeFinal>,
    @InjectRepository(TemplateAutoevaluacionImpacto)
    private readonly templateRepo: Repository<TemplateAutoevaluacionImpacto>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly participacionRepo: Repository<ParticipacionConvocatoria>,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ───────────── Template de autoevaluación (biblioteca) ─────────────

  listarTemplates() {
    return this.templateRepo.find({
      where: { esPlantilla: true },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerTemplate(id: string): Promise<TemplateAutoevaluacionImpacto> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Plantilla de autoevaluación no encontrada');
    return template;
  }

  async crearTemplate(dto: GuardarTemplateAutoevaluacionDto) {
    validarEstructuraAutoevaluacion(dto.estructura);
    await this.marcarUnicoDefault(dto.esDefault);
    return this.templateRepo.save(
      this.templateRepo.create({
        nombre: dto.nombre,
        esDefault: dto.esDefault ?? false,
        esPlantilla: true,
        estructura: dto.estructura ?? null,
      }),
    );
  }

  async actualizarTemplate(id: string, dto: GuardarTemplateAutoevaluacionDto) {
    const template = await this.obtenerTemplate(id);
    validarEstructuraAutoevaluacion(dto.estructura);
    if (dto.nombre !== undefined) template.nombre = dto.nombre;
    if (dto.estructura !== undefined) template.estructura = dto.estructura;
    if (dto.esDefault !== undefined) {
      await this.marcarUnicoDefault(dto.esDefault, id);
      template.esDefault = dto.esDefault;
    }
    return this.templateRepo.save(template);
  }

  async eliminarTemplate(id: string): Promise<void> {
    const template = await this.obtenerTemplate(id);
    await this.templateRepo.remove(template);
  }

  private async marcarUnicoDefault(esDefault: boolean | undefined, exceptoId?: string) {
    if (!esDefault) return;
    const actual = await this.templateRepo.findOne({ where: { esDefault: true } });
    if (actual && actual.id !== exceptoId) {
      actual.esDefault = false;
      await this.templateRepo.save(actual);
    }
  }

  // ───────────── Hitos ─────────────

  async listarHitos(edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarAccesoLecturaHitos(edicion, usuario);
    return this.hitoRepo.find({
      where: { edicionId },
      order: { fechaInicio: 'ASC' },
    });
  }

  async crearHito(edicionId: string, dto: CrearHitoDto, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEtapaEjecucionActiva(edicion);
    this.validarFechasHito(edicion, dto);

    const hito = await this.hitoRepo.save(
      this.hitoRepo.create({
        edicionId,
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        fechaInicio: dto.fechaInicio ?? null,
        fechaFin: dto.fechaFin ?? null,
        integrantes: dto.integrantes ?? null,
        categoria: dto.categoria,
        creadoPorId: usuario.id,
      }),
    );

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.CREACION,
      descripcion: `Creó el hito "${hito.titulo}"`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.HITO,
      entidadId: hito.id,
    });

    return hito;
  }

  async actualizarHito(id: string, dto: ActualizarHitoDto, usuario: Usuario) {
    const hito = await this.obtenerHito(id);
    const edicion = await this.obtenerEdicion(hito.edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEtapaEjecucionActiva(edicion);
    this.validarFechasHito(edicion, {
      fechaInicio: dto.fechaInicio ?? hito.fechaInicio ?? undefined,
      fechaFin: dto.fechaFin ?? hito.fechaFin ?? undefined,
    });

    if (dto.titulo !== undefined) hito.titulo = dto.titulo;
    if (dto.descripcion !== undefined) hito.descripcion = dto.descripcion;
    if (dto.fechaInicio !== undefined) hito.fechaInicio = dto.fechaInicio;
    if (dto.fechaFin !== undefined) hito.fechaFin = dto.fechaFin;
    if (dto.integrantes !== undefined) hito.integrantes = dto.integrantes;
    if (dto.categoria !== undefined) hito.categoria = dto.categoria;

    const guardado = await this.hitoRepo.save(hito);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: `Modificó el hito "${guardado.titulo}"`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.HITO,
      entidadId: guardado.id,
    });

    return guardado;
  }

  async eliminarHito(id: string, usuario: Usuario): Promise<void> {
    const hito = await this.obtenerHito(id);
    const edicion = await this.obtenerEdicion(hito.edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEtapaEjecucionActiva(edicion);

    await this.hitoRepo.softRemove(hito);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: `Eliminó el hito "${hito.titulo}"`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.HITO,
      entidadId: hito.id,
    });
  }

  // ───────────── Autoevaluación de impacto ─────────────

  async obtenerAutoevaluacion(edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarAccesoLecturaEjecucion(edicion, usuario);

    const convocatoria = await this.obtenerConvocatoriaConTemplate(edicion.convocatoriaId);
    const autoevaluacion = await this.autoevaluacionRepo.findOne({ where: { edicionId } });

    return {
      autoevaluacion,
      template: convocatoria.templateAutoevaluacionImpacto,
    };
  }

  async guardarAutoevaluacion(edicionId: string, dto: GuardarAutoevaluacionDto, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEtapaEjecucion(edicion);

    const convocatoria = await this.obtenerConvocatoriaConTemplate(edicion.convocatoriaId);
    const template = convocatoria.templateAutoevaluacionImpacto;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurada la autoevaluación de impacto',
      );
    }

    let autoevaluacion = await this.autoevaluacionRepo.findOne({ where: { edicionId } });
    if (autoevaluacion && autoevaluacion.estado === EstadoAutoevaluacion.Completada) {
      throw new BadRequestException('La autoevaluación ya fue completada y no puede modificarse');
    }

    validarRespuestasAutoevaluacion(template.estructura, dto.respuestas);

    if (!autoevaluacion) {
      autoevaluacion = this.autoevaluacionRepo.create({
        edicionId,
        convocatoriaId: edicion.convocatoriaId,
        templateId: template.id,
        estado: EstadoAutoevaluacion.Borrador,
        realizadoPorId: usuario.id,
      });
    }
    if (dto.respuestas !== undefined) autoevaluacion.respuestas = dto.respuestas;
    autoevaluacion.actualizadoPorId = usuario.id;
    const guardado = await this.autoevaluacionRepo.save(autoevaluacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: 'Guardó la autoevaluación de impacto',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.AUTOEVALUACION_IMPACTO,
      entidadId: guardado.id,
    });

    return { autoevaluacion: guardado, template, edicion: { id: edicion.id } };
  }

  async completarAutoevaluacion(edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEtapaEjecucion(edicion);

    const convocatoria = await this.obtenerConvocatoriaConTemplate(edicion.convocatoriaId);
    const template = convocatoria.templateAutoevaluacionImpacto;
    if (!template) {
      throw new BadRequestException('La convocatoria no tiene configurada la autoevaluación de impacto');
    }

    const autoevaluacion = await this.autoevaluacionRepo.findOne({ where: { edicionId } });
    if (!autoevaluacion) throw new NotFoundException('La autoevaluación no existe todavía');
    if (autoevaluacion.estado === EstadoAutoevaluacion.Completada) {
      throw new BadRequestException('La autoevaluación ya fue completada');
    }

    const faltantes = preguntasObligatoriasFaltantes(template.estructura, autoevaluacion.respuestas);
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Faltan responder las preguntas obligatorias: ${faltantes.join(', ')}`,
      );
    }

    autoevaluacion.estado = EstadoAutoevaluacion.Completada;
    autoevaluacion.confirmadoPorId = usuario.id;
    const guardado = await this.autoevaluacionRepo.save(autoevaluacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: 'Completó la autoevaluación de impacto',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.AUTOEVALUACION_IMPACTO,
      entidadId: guardado.id,
    });

    return guardado;
  }

  // ───────────── Informe final ─────────────

  async obtenerInforme(edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarAccesoLecturaEjecucion(edicion, usuario);
    const informe = await this.informeRepo.findOne({ where: { edicionId } });
    return informe;
  }

  async guardarInforme(edicionId: string, dto: GuardarInformeFinalDto, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEtapaEjecucion(edicion);

    let informe = await this.informeRepo.findOne({ where: { edicionId } });
    if (informe && informe.estado === EstadoInforme.Confirmado) {
      throw new BadRequestException('El informe final ya fue confirmado y no puede modificarse');
    }

    if (!informe) {
      informe = this.informeRepo.create({
        edicionId,
        convocatoriaId: edicion.convocatoriaId,
        estado: EstadoInforme.Borrador,
      });
    }
    if (dto.contenido !== undefined) informe.contenido = dto.contenido;
    if (dto.archivoAdjuntoUrl !== undefined) informe.archivoAdjuntoUrl = dto.archivoAdjuntoUrl;
    informe.actualizadoPorId = usuario.id;
    const guardado = await this.informeRepo.save(informe);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: 'Guardó el informe final',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.INFORME_FINAL,
      entidadId: guardado.id,
    });

    return guardado;
  }

  async confirmarInforme(edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarDirectorOCreador(edicion, usuario);
    this.validarEtapaEjecucion(edicion);

    let informe = await this.informeRepo.findOne({ where: { edicionId } });
    if (!informe) {
      informe = await this.informeRepo.save(
        this.informeRepo.create({
          edicionId,
          convocatoriaId: edicion.convocatoriaId,
          estado: EstadoInforme.Borrador,
          contenido: await this.autogenerarContenido(edicionId),
        }),
      );
    }
    if (informe.estado === EstadoInforme.Confirmado) {
      throw new BadRequestException('El informe final ya fue confirmado');
    }

    informe.estado = EstadoInforme.Confirmado;
    informe.confirmadoPorId = usuario.id;
    informe.confirmadoEn = new Date();
    const guardado = await this.informeRepo.save(informe);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: 'Confirmó el informe final',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.INFORME_FINAL,
      entidadId: guardado.id,
    });

    return guardado;
  }

  /** Genera el contenido inicial del informe a partir de los hitos registrados de la edición. */
  async autogenerarContenido(edicionId: string): Promise<string> {
    const hitos = await this.hitoRepo.find({ where: { edicionId }, order: { fechaInicio: 'ASC' } });
    if (hitos.length === 0) {
      return 'Informe final de la edición. (Aún no se registraron hitos de ejecución.)';
    }
    const cuerpos = hitos.map(
      (h, i) =>
        `${i + 1}. ${h.titulo}\nCategoría: ${h.categoria}\n` +
        `Período: ${h.fechaInicio ?? '—'} a ${h.fechaFin ?? '—'}\n` +
        `Integrantes: ${h.integrantes ?? '—'}\n${h.descripcion ?? ''}`.trim(),
    );
    return 'Informe final de la edición.\n\nActividades ejecutadas:\n\n' + cuerpos.join('\n\n');
  }

  // ───────────── Helpers ─────────────

  private async obtenerEdicion(id: string): Promise<Edicion> {
    const edicion = await this.edicionRepo.findOne({
      where: { id },
      relations: { proyecto: true, creadoPor: true, convocatoria: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');
    return edicion;
  }

  private async obtenerHito(id: string): Promise<Hito> {
    const hito = await this.hitoRepo.findOne({ where: { id } });
    if (!hito) throw new NotFoundException('Hito no encontrado');
    return hito;
  }

  private async obtenerConvocatoriaConTemplate(
    convocatoriaId: string,
  ): Promise<Convocatoria> {
    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
      relations: { templateAutoevaluacionImpacto: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    return convocatoria;
  }

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

  /** Determina si el usuario es creador o director de la edición (acceso de escritura). */
  private async validarDirectorOCreador(edicion: Edicion, usuario: Usuario) {
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

  /** Lectura de hitos: director/creador, Secretaría de la misma UA o Rectorado. */
  private async validarAccesoLecturaHitos(edicion: Edicion, usuario: Usuario) {
    if (this.esRectorado(usuario)) return;
    if (this.esSecretaria(usuario) && usuario.unidadAcademicaId === edicion.unidadAcademicaId) return;
    if (edicion.creadoPorId === usuario.id) return;
    const esDirector = await this.participacionRepo.findOneBy({
      edicionId: edicion.id,
      usuarioId: usuario.id,
      rol: RolEjecucion.DirectorDeProyecto,
    });
    if (esDirector) return;
    throw new ForbiddenException('No tenés acceso a los hitos de esta edición');
  }

  /** Lectura de autoevaluación/informe: director/creador, Secretaría o Rectorado. */
  private async validarAccesoLecturaEjecucion(edicion: Edicion, usuario: Usuario) {
    await this.validarAccesoLecturaHitos(edicion, usuario);
  }

  private validarEtapaEjecucion(edicion: Edicion): void {
    const esEjecucionOCierre =
      edicion.estado === EstadoEdicion.EnEjecucion || edicion.estado === EstadoEdicion.Cerrado;
    const convocatoriaEnEjecucion =
      edicion.convocatoria?.estado === EstadoConvocatoria.Ejecucion ||
      edicion.convocatoria?.estado === EstadoConvocatoria.Cierre;
    if (!esEjecucionOCierre || !convocatoriaEnEjecucion) {
      throw new BadRequestException('La edición no está en etapa de ejecución');
    }
  }

  /**
   * Como `validarEtapaEjecucion` pero exige que la convocatoria esté activa en
   * ejecución (no cerrada) y la edición en `EnEjecucion` (no `Cerrado`). Se usa
   * para las operaciones que quedan bloqueadas al cerrar la edición o la
   * convocatoria (hitos), a diferencia del informe final y la autoevaluación.
   */
  private validarEtapaEjecucionActiva(edicion: Edicion): void {
    if (edicion.estado !== EstadoEdicion.EnEjecucion) {
      throw new BadRequestException(this.motivoBloqueoHitos(edicion));
    }
    if (edicion.convocatoria?.estado !== EstadoConvocatoria.Ejecucion) {
      throw new BadRequestException(this.motivoBloqueoHitos(edicion));
    }
  }

  private motivoBloqueoHitos(edicion: Edicion): string {
    if (edicion.estado === EstadoEdicion.Cerrado) {
      return 'La edición está cerrada; no se pueden gestionar hitos';
    }
    if (edicion.convocatoria?.estado === EstadoConvocatoria.Cierre) {
      return 'La convocatoria está cerrada; no se pueden gestionar hitos';
    }
    return 'La edición no está en etapa de ejecución';
  }

  /**
   * Valida las fechas de un hito: la de inicio debe ser anterior o igual a la de fin,
   * y ambas deben caer dentro del período de ejecución de la convocatoria cuando éste esté definido.
   */
  private validarFechasHito(
    edicion: Edicion,
    fechas: { fechaInicio?: string; fechaFin?: string },
  ): void {
    const inicio = fechas.fechaInicio;
    const fin = fechas.fechaFin;

    if (inicio && fin && inicio > fin) {
      throw new BadRequestException(
        'La fecha de inicio del hito debe ser anterior o igual a la fecha de fin',
      );
    }

    const { fechaInicioEjecucion, fechaFinEjecucion } = edicion.convocatoria ?? {};
    const dentroDeEjecucion = (fecha: string): boolean => {
      if (fechaInicioEjecucion && fecha < fechaInicioEjecucion) return false;
      if (fechaFinEjecucion && fecha > fechaFinEjecucion) return false;
      return true;
    };

    if (inicio && !dentroDeEjecucion(inicio)) {
      throw new BadRequestException(
        'La fecha de inicio del hito debe estar dentro del período de ejecución de la convocatoria',
      );
    }
    if (fin && !dentroDeEjecucion(fin)) {
      throw new BadRequestException(
        'La fecha de fin del hito debe estar dentro del período de ejecución de la convocatoria',
      );
    }
  }
}