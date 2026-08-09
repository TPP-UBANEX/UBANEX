import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluacionInstitucional } from './evaluacion-institucional.entity';
import { EvaluacionCruzada } from './evaluacion-cruzada.entity';
import { GuardarEvaluacionInstitucionalDto } from './dto/guardar-evaluacion-institucional.dto';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { validarRespuestasInstitucionales } from './validar-respuestas-evaluacion';
import { EstructuraTemplateInstitucional } from '../templates-evaluacion/estructura-template';

@Injectable()
export class EvaluacionesService {
  constructor(
    @InjectRepository(EvaluacionInstitucional)
    private readonly institucionalRepo: Repository<EvaluacionInstitucional>,
    @InjectRepository(EvaluacionCruzada)
    private readonly cruzadaRepo: Repository<EvaluacionCruzada>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    private readonly auditoria: AuditoriaService,
  ) {}

  findAll(): Promise<[]> {
    return Promise.resolve([]);
  }

  // ───────────── Evaluación Institucional ─────────────

  async listarInstitucionales(convocatoriaId: string, usuario: Usuario) {
    this.validarEsSecretaria(usuario);
    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    const ediciones = await this.edicionRepo.find({
      where: {
        convocatoriaId,
        unidadAcademicaId: usuario.unidadAcademicaId,
        estado: EstadoEdicion.EnEvaluacion,
      },
      relations: { proyecto: true, unidadAcademica: true, creadoPor: true },
      order: { actualizadoEn: 'DESC' },
    });

    const evaluaciones = await this.institucionalRepo.find({
      where: { convocatoriaId },
      relations: { confirmadoPor: true },
    });
    const evaluacionPorEdicion = new Map(evaluaciones.map(e => [e.edicionId, e]));

    return ediciones.map(ed => ({
      edicion: ed,
      evaluacion: evaluacionPorEdicion.get(ed.id) ?? null,
    }));
  }

  async obtenerInstitucional(
    convocatoriaId: string,
    edicionId: string,
    usuario: Usuario,
  ) {
    const { convocatoria } = await this.validarEdicionParaInstitucional(convocatoriaId, edicionId, usuario);

    const evaluacion = await this.institucionalRepo.findOne({
      where: { edicionId },
      relations: { realizadoPor: true, confirmadoPor: true },
    });

    return {
      evaluacion,
      template: convocatoria.templateEvaluacionInstitucional,
    };
  }

  async guardarInstitucional(
    convocatoriaId: string,
    edicionId: string,
    dto: GuardarEvaluacionInstitucionalDto,
    usuario: Usuario,
  ) {
    const { convocatoria, edicion } = await this.validarEdicionParaInstitucional(convocatoriaId, edicionId, usuario);

    const template = convocatoria.templateEvaluacionInstitucional;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el template de evaluación institucional',
      );
    }

    let evaluacion = await this.institucionalRepo.findOne({ where: { edicionId } });
    if (evaluacion && evaluacion.estado === EstadoEvaluacion.Confirmada) {
      throw new BadRequestException('La evaluación ya fue confirmada y no puede modificarse');
    }

    validarRespuestasInstitucionales(template.estructura, dto.categorias, dto.checklist);

    if (!evaluacion) {
      evaluacion = this.institucionalRepo.create({
        convocatoriaId,
        edicionId,
        templateId: template.id,
        estado: EstadoEvaluacion.Borrador,
        realizadoPorId: usuario.id,
      });
    }
    if (dto.categorias !== undefined) evaluacion.categorias = dto.categorias;
    if (dto.checklist !== undefined) evaluacion.checklist = dto.checklist;
    if (dto.observaciones !== undefined) evaluacion.observaciones = dto.observaciones;
    const guardado = await this.institucionalRepo.save(evaluacion);

    return {
      evaluacion: guardado,
      template,
      edicion: { id: edicion.id, proyectoId: edicion.proyectoId },
    };
  }

  async confirmarInstitucional(
    convocatoriaId: string,
    edicionId: string,
    usuario: Usuario,
  ) {
    if (!usuario.roles.includes(RolUsuario.AutoridadDeSecretaria)) {
      throw new ForbiddenException('Solo una Autoridad de Secretaría puede confirmar la evaluación institucional');
    }

    const { convocatoria, edicion } = await this.validarEdicionParaInstitucional(convocatoriaId, edicionId, usuario);

    const template = convocatoria.templateEvaluacionInstitucional;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el template de evaluación institucional',
      );
    }

    const evaluacion = await this.institucionalRepo.findOne({ where: { edicionId } });
    if (!evaluacion) throw new NotFoundException('La evaluación institucional no existe todavía');
    if (evaluacion.estado === EstadoEvaluacion.Confirmada) {
      throw new BadRequestException('La evaluación ya fue confirmada');
    }

    this.validarCompletitudInstitucional(template.estructura, evaluacion);

    evaluacion.estado = EstadoEvaluacion.Confirmada;
    evaluacion.confirmadoPorId = usuario.id;
    const guardado = await this.institucionalRepo.save(evaluacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EVALUACION,
      descripcion: `Confirmó la evaluación institucional de la edición ${edicion.id.slice(0, 8)}...`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
    });

    return guardado;
  }

  private async validarEdicionParaInstitucional(
    convocatoriaId: string,
    edicionId: string,
    usuario: Usuario,
  ): Promise<{ convocatoria: Convocatoria; edicion: Edicion }> {
    this.validarEsSecretaria(usuario);

    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionInstitucional: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.estado !== EstadoConvocatoria.Evaluacion) {
      throw new BadRequestException('La convocatoria no está en etapa de evaluación');
    }

    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId, convocatoriaId },
      relations: { proyecto: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');
    if (edicion.unidadAcademicaId !== usuario.unidadAcademicaId) {
      throw new ForbiddenException(
        'Solo la Secretaría de la Unidad Académica de la edición puede evaluarla',
      );
    }

    return { convocatoria, edicion };
  }

  private validarEsSecretaria(usuario: Usuario): void {
    const esSecretaria = usuario.roles.some(r =>
      r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
    );
    if (!esSecretaria) {
      throw new ForbiddenException('Solo el personal de Secretaría puede evaluar institucionalmente');
    }
  }

  private validarCompletitudInstitucional(
    estructura: EstructuraTemplateInstitucional | null | undefined,
    evaluacion: EvaluacionInstitucional,
  ): void {
    const faltantes: string[] = [];
    const categorias = (evaluacion.categorias ?? {}) as Record<string, { valor?: unknown }>;
    for (const categoria of estructura?.categorias ?? []) {
      for (const sub of categoria.subcategorias) {
        const respuesta = categorias[sub.id];
        if (respuesta === undefined || respuesta.valor === undefined || respuesta.valor === null) {
          faltantes.push(sub.texto);
        }
      }
    }
    const checklist = (evaluacion.checklist ?? {}) as Record<string, unknown>;
    for (const item of estructura?.checklist ?? []) {
      if (checklist[item.id] === undefined || checklist[item.id] === null) {
        faltantes.push(item.texto);
      }
    }
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `La evaluación está incompleta. Faltan responder: ${faltantes.join(', ')}`,
      );
    }
  }
}
