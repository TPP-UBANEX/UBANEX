import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { EvaluacionInstitucional } from './evaluacion-institucional.entity';
import { EvaluacionCruzada } from './evaluacion-cruzada.entity';
import { GuardarEvaluacionInstitucionalDto } from './dto/guardar-evaluacion-institucional.dto';
import { GuardarEvaluacionCruzadaDto } from './dto/guardar-evaluacion-cruzada.dto';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { MailService } from '../common/mail/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { EstadoPropuestaEvaluador } from '../common/enums/estado-propuesta-evaluador.enum';
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';
import { MecanismoAdjudicacion } from '../common/enums/mecanismo-adjudicacion.enum';
import { TipoEvaluacionCruzada } from '../common/enums/tipo-evaluacion-cruzada.enum';
import { calcularPresupuestoAAdjudicar } from '../proyectos/presupuesto.util';
import { puedeAdjudicarse } from '../proyectos/adjudicacion';
import { GuardarAdjudicacionDto, EmitirAdjudicacionDto } from './dto/adjudicacion.dto';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { TipoEntidadAuditoria } from '../common/enums/tipo-entidad-auditoria.enum';
import {
  validarRespuestasInstitucionales,
  validarRespuestasCruzadas,
} from './validar-respuestas-evaluacion';
import { ListarEvaluacionesDto } from './dto/listar-evaluaciones.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
} from '../templates-evaluacion/estructura-template';

// ── Fórmula del resumen final de evaluación ─────────────────────────────
// El puntaje final (mérito) es la suma cruda del promedio de las evaluaciones
// cruzadas confirmadas más la evaluación institucional confirmada. Solo las
// subcategorías numéricas de la institucional suman: las booleanas son banderas
// informativas y no aportan puntaje (igual que el checklist). La asignación de
// fondos la define el presupuesto + cuota federativa, no un umbral de nota.
// Si hay una tercera evaluación cruzada (TerceraUa) confirmada, reemplaza a la
// Propia y a la Ajena en el promedio: no se promedian las tres, la tercera
// resuelve la inconsistencia y las descarta (ver cruzadasVigentes).

const UMBRAL_INCONSISTENCIA_DEFAULT = 40;

@Injectable()
export class EvaluacionesService {
  private readonly logger = new Logger(EvaluacionesService.name);

  constructor(
    @InjectRepository(EvaluacionInstitucional)
    private readonly institucionalRepo: Repository<EvaluacionInstitucional>,
    @InjectRepository(EvaluacionCruzada)
    private readonly cruzadaRepo: Repository<EvaluacionCruzada>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    @InjectRepository(Emparejamiento)
    private readonly emparejamientoRepo: Repository<Emparejamiento>,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly participacionRepo: Repository<ParticipacionConvocatoria>,
    @InjectRepository(Notificacion)
    private readonly notificacionRepo: Repository<Notificacion>,
    private readonly mail: MailService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async monitoreo(convocatoriaId: string, dto: ListarEvaluacionesDto) {
    const { page = 1, limit = 10 } = dto;
    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    const query = this.edicionRepo
      .createQueryBuilder('edicion')
      .leftJoinAndSelect('edicion.proyecto', 'proyecto')
      .leftJoinAndSelect('edicion.unidadAcademica', 'unidadAcademica')
      .where('edicion.convocatoriaId = :convocatoriaId', { convocatoriaId })
      .andWhere('edicion.eliminadoEn IS NULL')
      .orderBy('edicion.actualizadoEn', 'DESC');

    if (dto.search) {
      query.andWhere('proyecto.nombre ILIKE :search', { search: `%${dto.search}%` });
    }
    if (dto.unidadAcademicaId) {
      query.andWhere('edicion.unidadAcademicaId = :unidadAcademicaId', {
        unidadAcademicaId: dto.unidadAcademicaId,
      });
    }

    const [ediciones, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const institucionales = await this.institucionalRepo.find({
      where: { convocatoriaId },
      relations: { realizadoPor: true, confirmadoPor: true },
    });
    const cruzadas = await this.cruzadaRepo.find({
      where: { convocatoriaId },
      relations: { evaluador: true },
    });

    const instPorEdicion = new Map(institucionales.map((i) => [i.edicionId, i]));
    const cruzadasPorEdicion = new Map<string, EvaluacionCruzada[]>();
    for (const c of cruzadas) {
      const arr = cruzadasPorEdicion.get(c.edicionId) ?? [];
      arr.push(c);
      cruzadasPorEdicion.set(c.edicionId, arr);
    }

    return {
      convocatoria,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      ediciones: ediciones.map((ed) => ({
        ...this.mapearFilaOrden(ed, instPorEdicion, cruzadasPorEdicion),
        inconsistencia: this.calcularInconsistencia(
          cruzadasPorEdicion.get(ed.id) ?? [],
          convocatoria.umbralInconsistenciaCruzada,
        ),
      })),
    };
  }

  private mapearFilaOrden(
    ed: Edicion,
    instPorEdicion: Map<string, EvaluacionInstitucional>,
    cruzadasPorEdicion: Map<string, EvaluacionCruzada[]>,
  ) {
    const inst = instPorEdicion.get(ed.id) ?? null;
    return {
      edicion: ed,
      institucional: inst
        ? {
            id: inst.id,
            estado: inst.estado,
            observaciones: inst.observaciones,
            esPse: inst.esPse,
            realizadoPor: inst.realizadoPor
              ? { id: inst.realizadoPor.id, nombreCompleto: inst.realizadoPor.nombreCompleto }
              : null,
            confirmadoPor: inst.confirmadoPor
              ? { id: inst.confirmadoPor.id, nombreCompleto: inst.confirmadoPor.nombreCompleto }
              : null,
          }
        : null,
      cruzadas: (cruzadasPorEdicion.get(ed.id) ?? []).map((c) => ({
        id: c.id,
        tipo: c.tipo,
        estado: c.estado,
        evaluador: c.evaluador
          ? { id: c.evaluador.id, nombreCompleto: c.evaluador.nombreCompleto }
          : null,
      })),
    };
  }

  // Resumen de la evaluación de una edición para su director y las autoridades.
  // Durante el proceso solo se expone el estado; los detalles (valoraciones,
  // fundamentaciones, observaciones y puntajes) se muestran una vez confirmados.
  /** Orden de mérito confirmado, visible únicamente para la Secretaría de la UA.
   *  Solo devuelve los proyectos de la unidad académica del usuario autenticado. */
  async ordenMeritoPorUa(convocatoriaId: string, usuario: Usuario) {
    this.validarEsSecretaria(usuario);
    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (!convocatoria.ordenMeritoConfirmado || !usuario.unidadAcademicaId) {
      return {
        convocatoria,
        meta: { total: 0, page: 1, limit: 0, totalPages: 0 },
        ediciones: [],
      };
    }

    const ediciones = await this.edicionRepo.find({
      where: {
        convocatoriaId,
        unidadAcademicaId: usuario.unidadAcademicaId,
        eliminadoEn: IsNull(),
      },
      relations: { proyecto: true, unidadAcademica: true },
      order: { ordenMerito: 'ASC' },
    });
    const institucionales = await this.institucionalRepo.find({
      where: { convocatoriaId },
      relations: { realizadoPor: true, confirmadoPor: true },
    });
    const cruzadas = await this.cruzadaRepo.find({
      where: { convocatoriaId },
      relations: { evaluador: true },
    });
    const instPorEdicion = new Map(institucionales.map((i) => [i.edicionId, i]));
    const cruzadasPorEdicion = new Map<string, EvaluacionCruzada[]>();
    for (const c of cruzadas) {
      const arr = cruzadasPorEdicion.get(c.edicionId) ?? [];
      arr.push(c);
      cruzadasPorEdicion.set(c.edicionId, arr);
    }
    return {
      convocatoria,
      meta: { total: ediciones.length, page: 1, limit: ediciones.length, totalPages: 1 },
      ediciones: ediciones.map((ed) => this.mapearFilaOrden(ed, instPorEdicion, cruzadasPorEdicion)),
    };
  }

  /** Resultado mínimo para docentes: solo si sus proyectos fueron adjudicados.
   *  Visible únicamente cuando el orden de mérito está confirmado. */
  async ordenMeritoPorDocente(convocatoriaId: string, usuario: Usuario) {
    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (!convocatoria.ordenMeritoConfirmado) return { convocatoria, ediciones: [] };

    const participaciones = await this.participacionRepo.find({
      where: { usuarioId: usuario.id, convocatoriaId, edicionId: Not(IsNull()) },
      select: { edicionId: true },
    });
    const edicionIds = participaciones
      .map((p) => p.edicionId)
      .filter((id): id is string => id !== null && id !== undefined);
    if (edicionIds.length === 0) return { convocatoria, ediciones: [] };

    const ediciones = await this.edicionRepo.find({
      where: edicionIds.map((id) => ({ id, convocatoriaId, eliminadoEn: IsNull() })),
      relations: { proyecto: true, unidadAcademica: true },
      order: { ordenMerito: 'ASC' },
    });
    return {
      convocatoria,
      ediciones: ediciones.map((ed) => ({
        edicionId: ed.id,
        proyecto: ed.proyecto ? { nombre: ed.proyecto.nombre } : null,
        unidadAcademica: ed.unidadAcademica ? { nombre: ed.unidadAcademica.nombre } : null,
        adjudicado: ed.adjudicacionPropuesta ?? false,
      })),
    };
  }

  async evaluacionDeEdicion(edicionId: string, usuario: Usuario) {
    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId },
      relations: {
        unidadAcademica: true,
        creadoPor: true,
        convocatoria: { templateEvaluacionInstitucional: true, templateEvaluacionCruzada: true },
      },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');

    const roles = usuario.roles ?? [];
    const esRectorado = roles.some(
      (r) => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
    );
    const esSecretariaUA =
      roles.some(
        (r) => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
      ) && edicion.unidadAcademicaId === usuario.unidadAcademicaId;
    const esDirector =
      edicion.creadoPorId === usuario.id ||
      !!(await this.participacionRepo.findOne({
        where: {
          usuarioId: usuario.id,
          convocatoriaId: edicion.convocatoriaId,
          rol: RolEjecucion.DirectorDeProyecto,
        },
      }));

    if (!esDirector && !esSecretariaUA && !esRectorado) {
      throw new ForbiddenException('No tenés acceso a la evaluación de esta edición');
    }

    const institucional = await this.institucionalRepo.findOne({
      where: { edicionId },
      relations: { realizadoPor: true, confirmadoPor: true },
    });
    const cruzadas = await this.cruzadaRepo.find({
      where: { edicionId },
      relations: { evaluador: true },
      order: { tipo: 'ASC' },
    });

    const estructuraCruzada = edicion.convocatoria?.templateEvaluacionCruzada?.estructura ?? null;
    const maxCruzada = estructuraCruzada
      ? (estructuraCruzada.categorias ?? [])
          .flatMap((c) => c.items ?? [])
          .reduce((suma, item) => suma + (item.puntajeMaximo ?? 0), 0)
      : null;

    const verDetalleInst =
      esSecretariaUA || esRectorado || institucional?.estado === EstadoEvaluacion.Confirmada;
    const verDetalleCruz = (c: EvaluacionCruzada) =>
      esSecretariaUA || esRectorado || c.estado === EstadoEvaluacion.Confirmada;
    const algunaCruzadaConfirmada = cruzadas.some((c) => c.estado === EstadoEvaluacion.Confirmada);

    const cruzadasConfirmadas = cruzadas.filter((c) => c.estado === EstadoEvaluacion.Confirmada);
    const resumen = this.calcularResumen(institucional, cruzadasConfirmadas, edicion);

    return {
      convocatoria: {
        id: edicion.convocatoriaId,
        nombre: edicion.convocatoria?.nombre ?? null,
        estado: edicion.convocatoria?.estado ?? null,
      },
      institucional: institucional
        ? {
            id: institucional.id,
            estado: institucional.estado,
            observaciones: verDetalleInst ? institucional.observaciones : null,
            realizadoPor: institucional.realizadoPor
              ? {
                  id: institucional.realizadoPor.id,
                  nombreCompleto: institucional.realizadoPor.nombreCompleto,
                }
              : null,
            confirmadoPor: institucional.confirmadoPor
              ? {
                  id: institucional.confirmadoPor.id,
                  nombreCompleto: institucional.confirmadoPor.nombreCompleto,
                }
              : null,
            categorias: verDetalleInst ? institucional.categorias : null,
            checklist: verDetalleInst ? institucional.checklist : null,
            esPse: verDetalleInst ? institucional.esPse : null,
          }
        : null,
      cruzadas: cruzadas.map((c) => {
        const ver = verDetalleCruz(c);
        return {
          id: c.id,
          tipo: c.tipo,
          estado: c.estado,
          evaluador: c.evaluador
            ? { id: c.evaluador.id, nombreCompleto: c.evaluador.nombreCompleto }
            : null,
          observaciones: ver ? c.observaciones : null,
          items: ver ? c.items : null,
          puntaje: ver
            ? Object.values(c.items ?? {}).reduce<number>((suma, v) => suma + Number(v), 0)
            : null,
          puntajeMaximo: ver ? maxCruzada : null,
        };
      }),
      estructuraInstitucional: verDetalleInst
        ? (edicion.convocatoria?.templateEvaluacionInstitucional?.estructura ?? null)
        : null,
      estructuraCruzada:
        esSecretariaUA || esRectorado || algunaCruzadaConfirmada ? estructuraCruzada : null,
      resumen,
    };
  }

  // Puntaje final de la evaluación a partir de la institucional confirmada y
  // las cruzadas confirmadas. Es estado-agnóstico: no exige que la edición
  // esté en ejecución, así se puede usar para rankear durante la evaluación
  // (p.ej. para generar el orden de mérito). Devuelve null si falta
  // información para calcularlo.
  private calcularPuntaje(
    institucional: EvaluacionInstitucional | null,
    cruzadasConfirmadas: EvaluacionCruzada[],
    edicion: Edicion,
  ): {
    puntajeInstitucional: number;
    puntajeInstitucionalMaximo: number;
    puntajeCruzadaPromedio: number;
    puntajeCruzadaMaximo: number;
    notaFinal: number;
    checklistCompleto: boolean;
  } | null {
    if (
      !institucional ||
      institucional.estado !== EstadoEvaluacion.Confirmada ||
      cruzadasConfirmadas.length === 0
    ) {
      return null;
    }

    const estructuraInst =
      edicion.convocatoria?.templateEvaluacionInstitucional?.estructura ?? null;
    const estructuraCruzada = edicion.convocatoria?.templateEvaluacionCruzada?.estructura ?? null;
    if (!estructuraInst || !estructuraCruzada) return null;

    // Deliberadamente no incluye `institucional.esPse`: ese campo mueve el presupuesto a
    // adjudicar (ver presupuesto.util.ts#calcularPresupuestoAAdjudicar), no el puntaje.
    const subcategorias = (estructuraInst.categorias ?? []).flatMap((c) => c.subcategorias ?? []);
    const respuestas = (institucional.categorias ?? {}) as Record<string, { valor?: unknown }>;
    // Solo las subcategorías numéricas puntúan; las booleanas son informativas.
    const maxInst = subcategorias.reduce<number>(
      (suma, sub) => (sub.tipoValor === 'numerico' ? suma + (sub.maximo ?? 0) : suma),
      0,
    );
    const puntajeInst = subcategorias.reduce<number>(
      (suma, sub) =>
        sub.tipoValor === 'numerico' ? suma + Number(respuestas[sub.id]?.valor ?? 0) : suma,
      0,
    );

    const maxCruzada = (estructuraCruzada.categorias ?? [])
      .flatMap((c) => c.items ?? [])
      .reduce<number>((suma, item) => suma + (item.puntajeMaximo ?? 0), 0);
    const cruzadasVigentes = this.cruzadasVigentes(cruzadasConfirmadas);
    const promedioCruzada =
      cruzadasVigentes.reduce<number>((suma, c) => {
        const items = (c.items ?? {}) as Record<string, number>;
        const total = Object.values(items).reduce<number>((acc, v) => acc + Number(v), 0);
        return suma + total;
      }, 0) / cruzadasVigentes.length;

    const checklist = (institucional.checklist ?? {}) as Record<string, boolean>;
    const checklistCompleto = (estructuraInst.checklist ?? []).every(
      (item) => checklist[item.id] === true,
    );

    const notaFinal = Math.round((promedioCruzada + puntajeInst) * 10) / 10;

    return {
      puntajeInstitucional: puntajeInst,
      puntajeInstitucionalMaximo: maxInst,
      puntajeCruzadaPromedio: Math.round(promedioCruzada * 10) / 10,
      puntajeCruzadaMaximo: maxCruzada,
      notaFinal,
      checklistCompleto,
    };
  }

  private puntajeCruzada(cruzada: EvaluacionCruzada): number {
    return Object.values(cruzada.items ?? {}).reduce<number>((suma, v) => suma + Number(v), 0);
  }

  // Si hay una TerceraUa confirmada, su puntaje reemplaza al de la Propia y la
  // Ajena (mecanismo de resolución de inconsistencia extraordinaria): no se
  // promedian las tres, la tercera las descarta.
  private cruzadasVigentes(cruzadasConfirmadas: EvaluacionCruzada[]): EvaluacionCruzada[] {
    const tercera = cruzadasConfirmadas.find((c) => c.tipo === TipoEvaluacionCruzada.TerceraUa);
    return tercera ? [tercera] : cruzadasConfirmadas;
  }

  // Detecta una inconsistencia extraordinaria entre la evaluación Propia y la
  // Ajena: ambas confirmadas y con diferencia de puntaje que llega o supera el
  // umbral de la convocatoria. Devuelve null si aún no hay par confirmado.
  private calcularInconsistencia(
    cruzadas: EvaluacionCruzada[],
    umbral: number | null,
  ): {
    inconsistente: boolean;
    diferencia: number;
    umbral: number;
    terceraDesignada: boolean;
    terceraConfirmada: boolean;
  } | null {
    const propia = cruzadas.find(c => c.tipo === TipoEvaluacionCruzada.Propia);
    const ajena = cruzadas.find(c => c.tipo === TipoEvaluacionCruzada.Ajena);
    if (
      !propia ||
      !ajena ||
      propia.estado !== EstadoEvaluacion.Confirmada ||
      ajena.estado !== EstadoEvaluacion.Confirmada
    ) {
      return null;
    }
    const diferencia = Math.abs(this.puntajeCruzada(propia) - this.puntajeCruzada(ajena));
    const umbralEfectivo = umbral ?? UMBRAL_INCONSISTENCIA_DEFAULT;
    const tercera = cruzadas.find((c) => c.tipo === TipoEvaluacionCruzada.TerceraUa);
    return {
      inconsistente: diferencia >= umbralEfectivo,
      diferencia,
      umbral: umbralEfectivo,
      terceraDesignada: !!tercera,
      terceraConfirmada: tercera?.estado === EstadoEvaluacion.Confirmada,
    };
  }

  // Resumen final de la evaluación: se calcula cuando la edición ya está en
  // ejecución (o cerrada) y tanto la evaluación institucional como al menos
  // una cruzada fueron confirmadas. Es determinista: las evaluaciones
  // confirmadas son inmutables, así que no hace falta persistirlo.
  private calcularResumen(
    institucional: EvaluacionInstitucional | null,
    cruzadasConfirmadas: EvaluacionCruzada[],
    edicion: Edicion,
  ) {
    if (edicion.estado !== EstadoEdicion.EnEjecucion && edicion.estado !== EstadoEdicion.Cerrado) {
      return null;
    }
    return this.calcularPuntaje(institucional, cruzadasConfirmadas, edicion);
  }

  // Carga las ediciones de la convocatoria junto con su evaluación
  // institucional vigente y sus evaluaciones cruzadas, indexadas por edición.
  // Compartido por generarOrdenMerito y confirmarOrdenMerito.
  private async cargarDatosMerito(convocatoriaId: string): Promise<{
    ediciones: Edicion[];
    instPorEdicion: Map<string, EvaluacionInstitucional>;
    cruzadasPorEdicion: Map<string, EvaluacionCruzada[]>;
  }> {
    const ediciones = await this.edicionRepo.find({
      where: { convocatoriaId },
      order: { id: 'ASC' },
      relations: {
        proyecto: true,
        unidadAcademica: true,
        convocatoria: {
          templateEvaluacionInstitucional: true,
          templateEvaluacionCruzada: true,
        },
      },
    });
    const institucionales = await this.institucionalRepo.find({
      where: { convocatoriaId },
      order: { id: 'ASC' },
    });
    const cruzadas = await this.cruzadaRepo.find({
      where: { convocatoriaId },
      order: { id: 'ASC' },
    });

    // Selección determinista: si una edición tuviera más de una evaluación
    // institucional, se queda con la de mayor id (reproducible entre corridas).
    const instPorEdicion = new Map<string, EvaluacionInstitucional>();
    for (const i of institucionales) {
      const actual = instPorEdicion.get(i.edicionId);
      if (!actual || i.id > actual.id) instPorEdicion.set(i.edicionId, i);
    }
    const cruzadasPorEdicion = new Map<string, EvaluacionCruzada[]>();
    for (const c of cruzadas) {
      const arr = cruzadasPorEdicion.get(c.edicionId) ?? [];
      arr.push(c);
      cruzadasPorEdicion.set(c.edicionId, arr);
    }

    return { ediciones, instPorEdicion, cruzadasPorEdicion };
  }

  // El orden de mérito solo se puede generar o confirmar si TODAS las
  // ediciones que están en etapa de evaluación fueron evaluadas: institucional
  // confirmada + Propia y Ajena confirmadas, y si la diferencia entre Propia y
  // Ajena llega o supera el umbral de inconsistencia, además una TerceraUa
  // confirmada que las reemplaza. Si falta algo, se bloquea la operación
  // listando los proyectos afectados.
  private validarEdicionesListasParaMerito(
    accion: 'generar' | 'confirmar',
    ediciones: Edicion[],
    instPorEdicion: Map<string, EvaluacionInstitucional>,
    cruzadasPorEdicion: Map<string, EvaluacionCruzada[]>,
    umbral: number | null,
  ): void {
    const sinInstitucional: string[] = [];
    const sinCruzadasCompletas: string[] = [];
    const conInconsistenciaSinResolver: string[] = [];
    let diferenciaMaxima = 0;

    for (const ed of ediciones) {
      if (ed.estado !== EstadoEdicion.EnEvaluacion) continue;
      const nombre = ed.proyecto?.nombre ?? ed.id;

      const inst = instPorEdicion.get(ed.id) ?? null;
      if (!inst || inst.estado !== EstadoEvaluacion.Confirmada) {
        sinInstitucional.push(nombre);
        continue;
      }

      const cruzadas = cruzadasPorEdicion.get(ed.id) ?? [];
      const propiaConfirmada = cruzadas.some(
        (c) => c.tipo === TipoEvaluacionCruzada.Propia && c.estado === EstadoEvaluacion.Confirmada,
      );
      const ajenaConfirmada = cruzadas.some(
        (c) => c.tipo === TipoEvaluacionCruzada.Ajena && c.estado === EstadoEvaluacion.Confirmada,
      );
      if (!propiaConfirmada || !ajenaConfirmada) {
        sinCruzadasCompletas.push(nombre);
        continue;
      }

      const inconsistencia = this.calcularInconsistencia(cruzadas, umbral);
      if (inconsistencia?.inconsistente && !inconsistencia.terceraConfirmada) {
        conInconsistenciaSinResolver.push(nombre);
        diferenciaMaxima = Math.max(diferenciaMaxima, inconsistencia.umbral);
      }
    }

    if (
      sinInstitucional.length === 0 &&
      sinCruzadasCompletas.length === 0 &&
      conInconsistenciaSinResolver.length === 0
    ) {
      return;
    }

    const verbo = accion === 'generar' ? 'generar' : 'confirmar';
    const partes: string[] = [`No se puede ${verbo} el orden de mérito.`];
    if (sinInstitucional.length > 0) {
      partes.push(`Falta la evaluación institucional en: ${sinInstitucional.join(', ')}.`);
    }
    if (sinCruzadasCompletas.length > 0) {
      partes.push(
        `Faltan las evaluaciones cruzadas propia y ajena completas en: ${sinCruzadasCompletas.join(', ')}.`,
      );
    }
    if (conInconsistenciaSinResolver.length > 0) {
      partes.push(
        `Diferencia de ${diferenciaMaxima} o más puntos entre la propia y la ajena sin tercera evaluación confirmada en: ${conInconsistenciaSinResolver.join(', ')}. Designá una tercera Unidad Académica.`,
      );
    }
    throw new BadRequestException(partes.join(' '));
  }

  // Genera el orden de mérito automático de una convocatoria: rankea las
  // ediciones por notaFinal (suma del promedio de evaluaciones cruzadas y la
  // evaluación institucional) y propone una adjudicación borrador (no
  // definitiva) respetando la cuota federativa
  // mínima por unidad académica. No pisa el ordenMerito ya seteado a mano.
  async generarOrdenMerito(convocatoriaId: string, usuario: Usuario): Promise<Edicion[]> {
    this.validarEsRectorado(usuario);

    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
      relations: {
        templateEvaluacionInstitucional: true,
        templateEvaluacionCruzada: true,
      },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.ordenMeritoConfirmado) {
      throw new BadRequestException(
        'El orden de mérito ya está confirmado y no puede volver a generarse',
      );
    }

    const { ediciones, instPorEdicion, cruzadasPorEdicion } =
      await this.cargarDatosMerito(convocatoriaId);

    this.validarEdicionesListasParaMerito(
      'generar',
      ediciones,
      instPorEdicion,
      cruzadasPorEdicion,
      convocatoria.umbralInconsistenciaCruzada,
    );

    // Puntaje por edición (solo las que tienen evaluaciones confirmadas).
    const puntajes = new Map<string, { notaFinal: number; checklistCompleto: boolean }>();
    for (const ed of ediciones) {
      const inst = instPorEdicion.get(ed.id) ?? null;
      const cruzadasConf = (cruzadasPorEdicion.get(ed.id) ?? []).filter(
        (c) => c.estado === EstadoEvaluacion.Confirmada,
      );
      const p = this.calcularPuntaje(inst, cruzadasConf, ed);
      if (p) {
        puntajes.set(ed.id, {
          notaFinal: p.notaFinal,
          checklistCompleto: p.checklistCompleto,
        });
      }
    }

    // Rankear por notaFinal desc (tie-break: checklist completo, luego id).
    // Se recomputa el orden de TODAS las ediciones en cada generación:
    // las que tienen evaluación confirmada reciben su posición y las demás
    // quedan sin orden (null).
    const elegibles = ediciones
      .map((ed) => ({ ed, p: puntajes.get(ed.id) ?? null }))
      .sort((a, b) => {
        const pa = a.p;
        const pb = b.p;
        if (pa && pb) {
          if (pb.notaFinal !== pa.notaFinal) return pb.notaFinal - pa.notaFinal;
          if (pa.checklistCompleto !== pb.checklistCompleto) return pa.checklistCompleto ? -1 : 1;
          return a.ed.id < b.ed.id ? -1 : 1;
        }
        if (pa) return -1;
        if (pb) return 1;
        return 0;
      });

    let posicion = 1;
    for (const { ed, p } of elegibles) {
      if (p) {
        ed.ordenMerito = posicion++;
        ed.puntajeMerito = p.notaFinal;
      } else {
        ed.ordenMerito = null;
        ed.puntajeMerito = null;
      }
    }

    // Propuesta de adjudicación borrador, limitada por el presupuesto a adjudicar (presupuesto
    // solicitado + extra por insumos + extra por PSE, ver presupuesto.util.ts), con prioridad de
    // MÉRITO GLOBAL y un piso de CUOTA FEDERATIVA por unidad académica.
    //
    // Algoritmo dirigido por financiamiento (presupuesto general, no por UA):
    //   Paso 1 — MERITO global: se financian los mejores proyectos por mérito
    //            global (tope de MERITO por UA = n - cuota, y reserva de piso).
    //   Paso 2 — CUOTA FEDERATIVA (piso): por cada UA se financian como CUOTA
    //            FEDERATIVA los `cuota` proyectos NO financiados de MENOR
    //            puntaje (CUOTA FEDERATIVA = menor puntaje).
    //   Paso 3 — Excedente (swap): con el presupuesto general remanente, promover
    //            la CUOTA FEDERATIVA de mayor puntaje a MERITO y financiar como
    //            CUOTA FEDERATIVA el no-financiado de menor puntaje de esa UA
    //            (iterativo, round-robin).
    const propuesta = new Map<string, boolean>();
    const mecanismo = new Map<string, MecanismoAdjudicacion>();
    const costo = (ed: Edicion): number =>
      calcularPresupuestoAAdjudicar(
        ed.presupuestoSolicitado,
        convocatoria,
        instPorEdicion.get(ed.id)?.esPse === true,
      ).total;

    // Todas las ediciones con evaluación confirmada participan del cálculo.
    const elegiblesConPuntaje = elegibles.filter(({ p }) => p !== null).map(({ ed }) => ed);

    // Listas por UA ordenadas por puntaje de mérito (mejor primero).
    const listasPorUA = new Map<string, Edicion[]>();
    for (const ed of elegiblesConPuntaje) {
      const arr = listasPorUA.get(ed.unidadAcademicaId) ?? [];
      arr.push(ed);
      listasPorUA.set(ed.unidadAcademicaId, arr);
    }
    const porPuntajeDesc = (a: Edicion, b: Edicion): number => {
      const diff = (b.puntajeMerito ?? 0) - (a.puntajeMerito ?? 0);
      if (diff !== 0) return diff;
      if (a.id === b.id) return 0;
      return a.id < b.id ? -1 : 1;
    };
    // Comparador estable para selecciones GLOBALES: el puntaje define el orden,
    // y los empates se resuelven por nombre de UA y luego id, NUNCA solo por id.
    // Así el corte de presupuesto no depende del orden de inserción de los datos
    // (evita el no-determinismo entre reset-seed con puntajes iguales).
    const porPuntajeEstable = (a: Edicion, b: Edicion): number => {
      const diff = (b.puntajeMerito ?? 0) - (a.puntajeMerito ?? 0);
      if (diff !== 0) return diff;
      const na = a.unidadAcademica?.nombre ?? '';
      const nb = b.unidadAcademica?.nombre ?? '';
      if (na !== nb) return na < nb ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    };
    for (const lista of listasPorUA.values()) lista.sort(porPuntajeDesc);

    // Orden de las UAs explícito y determinista (alfabético por nombre). El
    // corte de presupuesto de los Pasos 2 y 3 depende de este orden cuando el
    // presupuesto es ajustado, así que fijarlo evita resultados distintos entre
    // corridas con los mismos datos.
    const nombreUaPorId = new Map<string, string>();
    for (const ed of elegiblesConPuntaje) {
      if (ed.unidadAcademicaId && ed.unidadAcademica?.nombre) {
        nombreUaPorId.set(ed.unidadAcademicaId, ed.unidadAcademica.nombre);
      }
    }
    const uas = [...listasPorUA.keys()].sort((a, b) =>
      (nombreUaPorId.get(a) ?? a).localeCompare(nombreUaPorId.get(b) ?? b),
    );

    const cuota = convocatoria.cuotaFederativa ?? 0;

    // Presupuesto disponible: null significa "sin límite" (comportamiento previo).
    // El presupuesto es GENERAL (único para toda la convocatoria, no por UA).
    const presupuestoTotal = convocatoria.presupuestoTotal;
    let disponible: number | null = presupuestoTotal != null ? Number(presupuestoTotal) : null;
    const descontar = (monto: number): void => {
      if (disponible != null) {
        disponible = Math.max(0, Math.round((disponible - monto) * 100) / 100);
      }
    };

    // Tope de MERITO por UA: protege a las UAs con pocos proyectos y deja el piso
    // de CUOTA FEDERATIVA libre (MERITO = top (n - cuota) por UA).
    const meritoMaxUA = new Map<string, number>();
    for (const ua of uas) {
      const n = listasPorUA.get(ua)!.length;
      meritoMaxUA.set(ua, Math.max(0, n - Math.min(cuota, n)));
    }
    const meritoHechoUA = new Map<string, number>();
    for (const ua of uas) meritoHechoUA.set(ua, 0);

    // Reserva de piso: costo de los `cuota` proyectos AÚN NO financiados más caros
    // de cada UA (peor caso), para garantizar que el piso de CUOTA FEDERATIVA sea financiable.
    const reservaCuotas = (): number => {
      let total = 0;
      for (const ua of uas) {
        const c = Math.min(cuota, listasPorUA.get(ua)!.length);
        const costos = elegiblesConPuntaje
          .filter((ed) => ed.unidadAcademicaId === ua && !propuesta.get(ed.id))
          .map((ed) => costo(ed))
          .sort((a, b) => b - a)
          .slice(0, c);
        total += costos.reduce((s, v) => s + v, 0);
      }
      return total;
    };

    // PASO 1 — MERITO global (con tope por UA y reserva de piso). Los mejores
    // proyectos por mérito global entran como MERITO y NUNCA pasan a CUOTA FEDERATIVA.
    const porMerito = [...elegiblesConPuntaje].sort(porPuntajeDesc);
    for (const ed of porMerito) {
      const ua = ed.unidadAcademicaId;
      if ((meritoHechoUA.get(ua) ?? 0) >= (meritoMaxUA.get(ua) ?? 0)) continue;
      const costoEd = costo(ed);
      if (disponible == null) {
        propuesta.set(ed.id, true);
        mecanismo.set(ed.id, MecanismoAdjudicacion.Merito);
        meritoHechoUA.set(ua, (meritoHechoUA.get(ua) ?? 0) + 1);
        continue;
      }
      propuesta.set(ed.id, true);
      if (disponible - costoEd >= reservaCuotas()) {
        mecanismo.set(ed.id, MecanismoAdjudicacion.Merito);
        meritoHechoUA.set(ua, (meritoHechoUA.get(ua) ?? 0) + 1);
        descontar(costoEd);
      } else {
        propuesta.delete(ed.id);
      }
    }

    // PASO 2 — CUOTA FEDERATIVA en orden GLOBAL por puntaje, garantizando la
    // cuota de cada UA. Para cada UA se reserva su cuota (min(cuota, n) mejores
    // proyectos por puntaje). Luego se recorre la lista GLOBAL por puntaje y se
    // financia como CUOTA FEDERATIVA todo proyecto reservado cuya UA aún no
    // llegó a su cuota y quepa en el presupuesto. Así el orden de financiación
    // es global (ya no es UA por UA) pero la cuota de cada UA tiene prioridad
    // sobre el excedente: ningún proyecto por encima de la cuota se financia
    // como CUOTA FEDERATIVA antes de cubrir las cuotas reservadas. Las UAs que
    // presentaron menos de `cuota` proyectos reservan todos los suyos. El
    // excedente (no reservado) se financia por MÉRITO global en la Fase 3 (swap),
    // que se ejecuta tal cual está.
    const cuotaPorUa = new Map<string, number>();
    for (const ua of uas) cuotaPorUa.set(ua, 0);
    const reservaCuota = new Set<string>();
    for (const ua of uas) {
      const c = Math.min(cuota, listasPorUA.get(ua)!.length);
      listasPorUA
        .get(ua)!
        .filter((ed) => !propuesta.get(ed.id))
        .sort(porPuntajeDesc)
        .slice(0, c)
        .forEach((ed) => reservaCuota.add(ed.id));
    }
    const globalCuota = [...elegiblesConPuntaje].sort(porPuntajeEstable);
    for (const ed of globalCuota) {
      if (!reservaCuota.has(ed.id)) continue;
      const ua = ed.unidadAcademicaId;
      if (cuotaPorUa.get(ua)! >= Math.min(cuota, listasPorUA.get(ua)!.length)) continue;
      const costoEd = costo(ed);
      if (disponible != null && costoEd > disponible) continue;
      propuesta.set(ed.id, true);
      mecanismo.set(ed.id, MecanismoAdjudicacion.CuotaFederativa);
      descontar(costoEd);
      cuotaPorUa.set(ua, cuotaPorUa.get(ua)! + 1);
    }

    // PASO 3 — Excedente (swap), presupuesto GENERAL. Selección GREEDY por mérito:
    // en cada iteración se toma la CUOTA FEDERATIVA financiada de MAYOR puntaje
    // de TODA la convocatoria cuya UA aún tenga un proyecto no financiado; se
    // promueve a MERITO y se financia como CUOTA FEDERATIVA el no-financiado de
    // mayor puntaje de ESA MISMA UA. Si el reemplazo no cabe en el presupuesto,
    // se corta (no se promueve una CUOTA FEDERATIVA de menor mérito mientras
    // exista una mayor sin promover).
    while (true) {
      const uasConNoFinanciado = new Set(
        elegiblesConPuntaje
          .filter((ed) => !propuesta.get(ed.id))
          .map((ed) => ed.unidadAcademicaId),
      );
      const mejorCuota = elegiblesConPuntaje
        .filter(
          (ed) =>
            propuesta.get(ed.id) &&
            mecanismo.get(ed.id) === MecanismoAdjudicacion.CuotaFederativa &&
            uasConNoFinanciado.has(ed.unidadAcademicaId),
        )
        .sort(porPuntajeEstable)[0];
      if (!mejorCuota) break;
      const ua = mejorCuota.unidadAcademicaId;
      const u = elegiblesConPuntaje
        .filter((ed) => ed.unidadAcademicaId === ua && !propuesta.get(ed.id))
        .sort(porPuntajeDesc)[0]; // mayor puntaje -> nueva CUOTA FEDERATIVA (contigua a MERITO)
      if (!u) break;
      const costoU = costo(u);
      if (disponible != null && costoU > disponible) break;
      mecanismo.set(mejorCuota.id, MecanismoAdjudicacion.Merito); // promover la CUOTA FEDERATIVA de mayor mérito
      propuesta.set(u.id, true);
      mecanismo.set(u.id, MecanismoAdjudicacion.CuotaFederativa); // nueva CUOTA FEDERATIVA de la misma UA
      descontar(costoU);
    }

    // Aplicar: todas las ediciones se recalculan según la propuesta automática;
    // las que no tienen evaluación confirmada quedan sin adjudicación (null).
    for (const ed of ediciones) {
      ed.adjudicacionPropuesta = puntajes.has(ed.id) ? (propuesta.get(ed.id) ?? false) : null;
      ed.mecanismoAdjudicacion =
        ed.adjudicacionPropuesta && mecanismo.has(ed.id) ? mecanismo.get(ed.id)! : null;
    }

    await this.edicionRepo.save(ediciones);
    return ediciones;
  }

  // Ajusta manualmente la adjudicación propuesta (borrador) de una edición.
  // Solo el Rectorado puede hacerlo para resolver empates o corregir la
  // propuesta generada automáticamente.
  async actualizarPropuestaAdjudicacion(
    edicionId: string,
    adjudicado: boolean,
    mecanismo: MecanismoAdjudicacion | undefined,
    usuario: Usuario,
  ): Promise<Edicion> {
    this.validarEsRectorado(usuario);
    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId },
      relations: { proyecto: true, unidadAcademica: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');

    const convocatoriaAdjudicacion = await this.convocatoriaRepo.findOne({
      where: { id: edicion.convocatoriaId },
    });
    if (convocatoriaAdjudicacion?.ordenMeritoConfirmado) {
      throw new BadRequestException(
        'El orden de mérito está confirmado y la adjudicación no puede modificarse',
      );
    }

    // Guarda de presupuesto: no se puede adjudicar si no alcanza para este proyecto (se compara
    // contra el presupuesto a adjudicar, no contra el solicitado).
    if (adjudicado && edicion.adjudicacionPropuesta !== true) {
      const convocatoria = await this.convocatoriaRepo.findOne({
        where: { id: edicion.convocatoriaId },
      });
      const tope =
        convocatoria?.presupuestoTotal != null ? Number(convocatoria.presupuestoTotal) : null;
      if (tope != null) {
        const todas = await this.edicionRepo.find({
          where: { convocatoriaId: edicion.convocatoriaId },
        });
        const institucionales = await this.institucionalRepo.find({
          where: { convocatoriaId: edicion.convocatoriaId },
          select: { edicionId: true, esPse: true },
        });
        const esPsePorEdicion = new Map(institucionales.map((i) => [i.edicionId, i.esPse === true]));
        const adjudicadoSum = todas
          .filter((e) => e.adjudicacionPropuesta === true)
          .reduce(
            (s, e) =>
              s
              + calcularPresupuestoAAdjudicar(e.presupuestoSolicitado, convocatoria, esPsePorEdicion.get(e.id))
                .total,
            0,
          );
        const costo = calcularPresupuestoAAdjudicar(
          edicion.presupuestoSolicitado,
          convocatoria,
          esPsePorEdicion.get(edicion.id),
        ).total;
        if (adjudicadoSum + costo > tope + 0.001) {
          throw new BadRequestException(
            'No hay presupuesto disponible para adjudicar este proyecto',
          );
        }
      }
    }

    edicion.adjudicacionPropuesta = adjudicado;
    edicion.mecanismoAdjudicacion = adjudicado
      ? mecanismo ?? MecanismoAdjudicacion.Merito
      : null;
    return this.edicionRepo.save(edicion);
  }

  async confirmarOrdenMerito(
    convocatoriaId: string,
    usuario: Usuario,
  ): Promise<Convocatoria> {
    this.validarEsAutoridadRectorado(usuario);

    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.estado !== EstadoConvocatoria.Evaluacion) {
      throw new BadRequestException('La convocatoria no está en etapa de evaluación');
    }
    if (convocatoria.ordenMeritoConfirmado) {
      return convocatoria;
    }

    const { ediciones, instPorEdicion, cruzadasPorEdicion } =
      await this.cargarDatosMerito(convocatoriaId);
    this.validarEdicionesListasParaMerito(
      'confirmar',
      ediciones,
      instPorEdicion,
      cruzadasPorEdicion,
      convocatoria.umbralInconsistenciaCruzada,
    );

    const sinOrden = await this.edicionRepo.count({
      where: { convocatoriaId, estado: EstadoEdicion.EnEvaluacion, ordenMerito: IsNull() },
    });
    if (sinOrden > 0) {
      throw new BadRequestException(
        'No se puede confirmar: hay proyectos en evaluación sin orden de mérito asignado. Generá el orden de mérito para todas las ediciones primero.',
      );
    }

    convocatoria.ordenMeritoConfirmado = true;
    const guardada = await this.convocatoriaRepo.save(convocatoria);
    void this.notificarResultadoAdjudicacion(guardada).catch((err) =>
      this.logger.error(`Error enviando notificaciones de adjudicación: ${String(err)}`),
    );
    return guardada;
  }

  // ───────────── Resolución de adjudicación ─────────────
  // Tercer paso, posterior a confirmar el orden de mérito: Rectorado carga el
  // link a la resolución (no se suben archivos), la fecha y el monto por
  // proyecto, y al emitir las ediciones pasan a Adjudicado / NoAdjudicado.
  // Requisito: cada edición adjudicada debe tener el aval del decano cargado.

  // Normaliza el link de la resolución: si no trae esquema, se le antepone https://
  private normalizarResolucionUrl(url: string | null | undefined): string | null {
    const v = (url ?? '').trim();
    if (!v) return null;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }

  private validarConvocatoriaParaAdjudicacion(convocatoria: Convocatoria): void {
    if (convocatoria.estado !== EstadoConvocatoria.Evaluacion) {
      throw new BadRequestException('La convocatoria no está en etapa de evaluación');
    }
    if (!convocatoria.ordenMeritoConfirmado) {
      throw new BadRequestException(
        'El orden de mérito todavía no fue confirmado; no se puede trabajar la resolución de adjudicación',
      );
    }
    if (convocatoria.adjudicacionEmitida) {
      throw new BadRequestException(
        'La resolución de adjudicación ya fue emitida y no puede modificarse',
      );
    }
  }

  async obtenerAdjudicacion(convocatoriaId: string, usuario: Usuario) {
    this.validarEsRectorado(usuario);

    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    const ediciones = await this.edicionRepo.find({
      where: { convocatoriaId },
      relations: { proyecto: true, unidadAcademica: true },
    });
    const institucionales = await this.institucionalRepo.find({
      where: { convocatoriaId },
      select: { edicionId: true, esPse: true },
    });
    const esPsePorEdicion = new Map(institucionales.map((i) => [i.edicionId, i.esPse === true]));

    const items = ediciones
      .map((e) => ({
        edicionId: e.id,
        proyectoId: e.proyectoId,
        proyectoNombre: e.proyecto?.nombre ?? null,
        unidadAcademica: e.unidadAcademica
          ? { id: e.unidadAcademica.id, nombre: e.unidadAcademica.nombre }
          : null,
        estadoEdicion: e.estado,
        ordenMerito: e.ordenMerito,
        puntajeMerito: e.puntajeMerito,
        adjudicacionPropuesta: e.adjudicacionPropuesta,
        mecanismoAdjudicacion: e.mecanismoAdjudicacion ?? null,
        montoAdjudicado: e.montoAdjudicado,
        presupuestoAAdjudicar: calcularPresupuestoAAdjudicar(
          e.presupuestoSolicitado,
          convocatoria,
          esPsePorEdicion.get(e.id),
        ).total,
        tieneAval: puedeAdjudicarse(e),
      }))
      .sort((a, b) => {
        if (a.ordenMerito == null && b.ordenMerito == null) return 0;
        if (a.ordenMerito == null) return 1;
        if (b.ordenMerito == null) return -1;
        return a.ordenMerito - b.ordenMerito;
      });

    return {
      convocatoria: {
        id: convocatoria.id,
        ordenMeritoConfirmado: convocatoria.ordenMeritoConfirmado,
        adjudicacionEmitida: convocatoria.adjudicacionEmitida,
        resolucionUrl: convocatoria.resolucionUrl,
        fechaResolucion: convocatoria.fechaResolucion,
      },
      items,
    };
  }

  async guardarBorradorAdjudicacion(
    convocatoriaId: string,
    dto: GuardarAdjudicacionDto,
    usuario: Usuario,
  ): Promise<Convocatoria> {
    this.validarEsRectorado(usuario);

    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    this.validarConvocatoriaParaAdjudicacion(convocatoria);

    if (dto.resolucionUrl !== undefined) {
      convocatoria.resolucionUrl = this.normalizarResolucionUrl(dto.resolucionUrl);
    }
    if (dto.fechaResolucion !== undefined) {
      convocatoria.fechaResolucion = dto.fechaResolucion || null;
    }
    const guardada = await this.convocatoriaRepo.save(convocatoria);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: 'Guardó el borrador de la resolución de adjudicación',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.ADJUDICACION,
      entidadId: convocatoriaId,
    });

    return guardada;
  }

  async emitirAdjudicacion(
    convocatoriaId: string,
    dto: EmitirAdjudicacionDto,
    usuario: Usuario,
  ): Promise<{ convocatoria: Convocatoria; ediciones: Edicion[] }> {
    this.validarEsAutoridadRectorado(usuario);

    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    this.validarConvocatoriaParaAdjudicacion(convocatoria);

    const ediciones = await this.edicionRepo.find({
      where: { convocatoriaId },
      relations: { proyecto: true, unidadAcademica: true },
    });
    const institucionales = await this.institucionalRepo.find({
      where: { convocatoriaId },
      select: { edicionId: true, esPse: true },
    });
    const esPsePorEdicion = new Map(institucionales.map((i) => [i.edicionId, i.esPse === true]));

    const adjudicadas = ediciones.filter((e) => e.adjudicacionPropuesta === true);
    if (adjudicadas.length === 0) {
      throw new BadRequestException(
        'No hay ediciones propuestas para adjudicación en el orden de mérito',
      );
    }

    // Gate del aval: toda edición adjudicada necesita el aval firmado del decano.
    const faltanAval = adjudicadas.filter((e) => !puedeAdjudicarse(e));
    if (faltanAval.length > 0) {
      const nombres = faltanAval.map((e) => e.proyecto?.nombre ?? e.id).join(', ');
      throw new BadRequestException(
        `No se puede emitir la resolución: faltan los avales de: ${nombres}`,
      );
    }

    for (const edicion of ediciones) {
      if (edicion.adjudicacionPropuesta === true) {
        edicion.estado = EstadoEdicion.Adjudicado;
        // El monto adjudicado es fijo: sale de la fórmula presupuesto a adjudicar
        // (solicitado + extra insumos + extra PSE), la misma que usa el orden de
        // mérito. No se edita a mano.
        edicion.montoAdjudicado = calcularPresupuestoAAdjudicar(
          edicion.presupuestoSolicitado,
          convocatoria,
          esPsePorEdicion.get(edicion.id),
        ).total;
      } else if (edicion.estado === EstadoEdicion.EnEvaluacion) {
        edicion.estado = EstadoEdicion.NoAdjudicado;
      }
    }

    await this.edicionRepo.manager.transaction(async (manager) => {
      await manager.save(ediciones);
      convocatoria.adjudicacionEmitida = true;
      convocatoria.resolucionUrl = this.normalizarResolucionUrl(dto.resolucionUrl);
      convocatoria.fechaResolucion = dto.fechaResolucion;
      convocatoria.adjudicacionEmitidaPorId = usuario.id;
      await manager.save(convocatoria);
    });

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EDICION,
      descripcion: 'Emitió la resolución de adjudicación',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.ADJUDICACION,
      entidadId: convocatoriaId,
    });

    return { convocatoria, ediciones };
  }

  // Al confirmar el orden de mérito (cierre definitivo de la convocatoria) se
  // notifica a cada director de proyecto (creadoPor) si su proyecto fue
  // adjudicado o no, vía mail y notificación en el sitio. Cada envío está en su
  // propio try/catch para que un fallo no impida el resto ni la confirmación.
  // Al confirmar el orden de mérito (cierre definitivo de la convocatoria) se
  // notifica a cada director de proyecto (creadoPor) si su proyecto fue
  // adjudicado o no, vía mail y notificación en el sitio. Cada envío está en su
  // propio try/catch para que un fallo no impida el resto ni la confirmación.
  // Se ejecuta en paralelo (Promise.allSettled) y se despacha en background
  // desde confirmarOrdenMerito, para no bloquear la respuesta del endpoint.
  private async notificarResultadoAdjudicacion(convocatoria: Convocatoria): Promise<void> {
    const ediciones = await this.edicionRepo.find({
      where: { convocatoriaId: convocatoria.id },
      relations: { creadoPor: true, proyecto: true },
    });

    const tareas = ediciones.map(async (ed) => {
      const director = ed.creadoPor;
      if (!director?.email) return;

      const adjudicado = !!ed.adjudicacionPropuesta;
      const nombreProyecto = ed.proyecto?.nombre ?? 'tu proyecto';
      const mensaje = adjudicado
        ? `Tu proyecto "${nombreProyecto}" fue adjudicado en la convocatoria "${convocatoria.nombre}".`
        : `Tu proyecto "${nombreProyecto}" no fue adjudicado en la convocatoria "${convocatoria.nombre}".`;

      try {
        await this.notificacionRepo.save(
          this.notificacionRepo.create({
            usuarioId: director.id,
            tipo: TipoNotificacion.RESULTADO_ADJUDICACION,
            mensaje,
          }),
        );
      } catch (err) {
        this.logger.error(
          `No se pudo crear la notificación de adjudicación para ${director.id}: ${String(err)}`,
        );
      }
    });

    await Promise.allSettled(tareas);
  }

  // ───────────── Evaluación Institucional ─────────────

  async listarInstitucionales(
    convocatoriaId: string,
    usuario: Usuario,
    dto: ListarEvaluacionesDto,
  ): Promise<PaginatedResponse<{ edicion: Edicion; evaluacion: EvaluacionInstitucional | null }>> {
    const { page = 1, limit = 10 } = dto;
    this.validarEsSecretaria(usuario);
    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    const ediciones = await this.edicionRepo.find({
      where: {
        convocatoriaId,
        unidadAcademicaId: usuario.unidadAcademicaId,
        estado: EstadoEdicion.EnEvaluacion,
      },
      relations: {
        proyecto: { unidadAcademicaAdicional: true },
        unidadAcademica: true,
        creadoPor: true,
      },
      order: { actualizadoEn: 'DESC' },
    });

    const evaluaciones = await this.institucionalRepo.find({
      where: { convocatoriaId },
      relations: { confirmadoPor: true },
    });
    const evaluacionPorEdicion = new Map(evaluaciones.map((e) => [e.edicionId, e]));

    let items: Array<{ edicion: Edicion; evaluacion: EvaluacionInstitucional | null }> =
      ediciones.map((ed) => ({
        edicion: ed,
        evaluacion: evaluacionPorEdicion.get(ed.id) ?? null,
      }));

    if (dto.search) {
      const termino = dto.search.toLowerCase();
      items = items.filter((i) =>
        (i.edicion.proyecto?.nombre ?? '').toLowerCase().includes(termino),
      );
    }
    if (dto.estado) {
      items = items.filter((i) => {
        if (dto.estado === 'sin_evaluar') return i.evaluacion === null;
        if (dto.estado === 'borrador') return i.evaluacion?.estado === EstadoEvaluacion.Borrador;
        if (dto.estado === 'confirmada')
          return i.evaluacion?.estado === EstadoEvaluacion.Confirmada;
        return true;
      });
    }

    const total = items.length;
    const pagina = items.slice((page - 1) * limit, page * limit);

    return {
      data: pagina,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async obtenerInstitucional(convocatoriaId: string, edicionId: string, usuario: Usuario) {
    const { convocatoria } = await this.validarEdicionParaInstitucional(
      convocatoriaId,
      edicionId,
      usuario,
    );

    const evaluacion = await this.institucionalRepo.findOne({
      where: { edicionId },
      relations: { realizadoPor: true, actualizadoPor: true, confirmadoPor: true },
    });

    return {
      evaluacion,
      template: convocatoria.templateEvaluacionInstitucional,
    };
  }

  async historialInstitucional(convocatoriaId: string, edicionId: string, usuario: Usuario) {
    await this.validarEdicionParaInstitucional(convocatoriaId, edicionId, usuario);

    const evaluacion = await this.institucionalRepo.findOne({
      where: { edicionId },
      select: { id: true },
    });
    if (!evaluacion) return [];

    const registros = await this.auditoria.listarPorEntidad(
      TipoEntidadAuditoria.EVALUACION_INSTITUCIONAL,
      evaluacion.id,
    );
    return registros.map((r) => ({
      fecha: r.fecha,
      accion: r.accion,
      descripcion: r.descripcion,
      usuarioId: r.usuarioId,
      usuarioNombre: r.usuario?.nombreCompleto ?? r.responsableNombre,
    }));
  }

  async guardarInstitucional(
    convocatoriaId: string,
    edicionId: string,
    dto: GuardarEvaluacionInstitucionalDto,
    usuario: Usuario,
  ) {
    const { convocatoria, edicion } = await this.validarEdicionParaInstitucional(
      convocatoriaId,
      edicionId,
      usuario,
    );

    const template = convocatoria.templateEvaluacionInstitucional;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación institucional',
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
    if (dto.esPse !== undefined) evaluacion.esPse = dto.esPse;
    evaluacion.actualizadoPorId = usuario.id;
    const guardado = await this.institucionalRepo.save(evaluacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EVALUACION,
      descripcion: 'Guardó la evaluación institucional',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.EVALUACION_INSTITUCIONAL,
      entidadId: guardado.id,
    });

    return {
      evaluacion: guardado,
      template,
      edicion: { id: edicion.id, proyectoId: edicion.proyectoId },
    };
  }

  async confirmarInstitucional(convocatoriaId: string, edicionId: string, usuario: Usuario) {
    if (!usuario.roles.includes(RolUsuario.AutoridadDeSecretaria)) {
      throw new ForbiddenException(
        'Solo una Autoridad de Secretaría puede confirmar la evaluación institucional',
      );
    }

    const { convocatoria } = await this.validarEdicionParaInstitucional(
      convocatoriaId,
      edicionId,
      usuario,
    );

    const template = convocatoria.templateEvaluacionInstitucional;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación institucional',
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
      descripcion: 'Confirmó la evaluación institucional',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.EVALUACION_INSTITUCIONAL,
      entidadId: guardado.id,
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
    const esSecretaria = usuario.roles.some(
      (r) => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
    );
    if (!esSecretaria) {
      throw new ForbiddenException(
        'Solo el personal de Secretaría puede evaluar institucionalmente',
      );
    }
  }

  private validarEsRectorado(usuario: Usuario): void {
    const esRectorado = usuario.roles.some(
      (r) => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
    );
    if (!esRectorado) {
      throw new ForbiddenException('Solo el Rectorado puede generar el orden de mérito');
    }
  }

  private validarEsAutoridadRectorado(usuario: Usuario): void {
    if (!usuario.roles.includes(RolUsuario.AutoridadDeRectorado)) {
      throw new ForbiddenException(
        'Solo la Autoridad de Rectorado puede confirmar el orden de mérito',
      );
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
    // Fijo y obligatorio, independiente del template (ver evaluacion-institucional.entity.ts#esPse).
    if (evaluacion.esPse === undefined || evaluacion.esPse === null) {
      faltantes.push('¿Es una Práctica Social Educativa?');
    }
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `La evaluación está incompleta. Faltan responder: ${faltantes.join(', ')}`,
      );
    }
  }

  // ───────────── Evaluación Cruzada ─────────────

  async listarCruzadasDisponibles(
    convocatoriaId: string,
    usuario: Usuario,
    dto: ListarEvaluacionesDto,
  ): Promise<
    PaginatedResponse<{
      edicion: Edicion;
      tipo: TipoEvaluacionCruzada;
      evaluacion: EvaluacionCruzada | null;
    }>
  > {
    const { page = 1, limit = 10 } = dto;
    const convocatoria = await this.convocatoriaRepo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.estado !== EstadoConvocatoria.Evaluacion) {
      throw new BadRequestException('La convocatoria no está en etapa de evaluación');
    }
    await this.validarEvaluadorAprobado(convocatoriaId, usuario.id);

    const uaEmparejada = await this.obtenerUaEmparejada(convocatoriaId, usuario.unidadAcademicaId);
    const conflictos = await this.edicionesConConflicto(usuario.id, convocatoriaId);

    const misEvaluaciones = await this.cruzadaRepo.find({
      where: { evaluadorId: usuario.id, convocatoriaId },
    });
    const misEdicionesEvaluadas = new Set(misEvaluaciones.map((e) => e.edicionId));

    const evaluacionesConvocatoria = await this.cruzadaRepo.find({ where: { convocatoriaId } });
    const propiosEvaluados = new Set(
      evaluacionesConvocatoria
        .filter((e) => e.tipo === TipoEvaluacionCruzada.Propia)
        .map((e) => e.edicionId),
    );
    const ajenosEvaluados = new Set(
      evaluacionesConvocatoria
        .filter((e) => e.tipo === TipoEvaluacionCruzada.Ajena)
        .map((e) => e.edicionId),
    );

    const ediciones = await this.edicionRepo.find({
      where: { convocatoriaId, estado: EstadoEdicion.EnEvaluacion },
      relations: {
        proyecto: { unidadAcademicaAdicional: true },
        unidadAcademica: true,
        creadoPor: true,
      },
      order: { actualizadoEn: 'DESC' },
    });

    const resultado: Array<{
      edicion: Edicion;
      tipo: TipoEvaluacionCruzada;
      evaluacion: EvaluacionCruzada | null;
    }> = [];

    for (const ed of ediciones) {
      if (conflictos.has(ed.id)) continue;

      if (misEdicionesEvaluadas.has(ed.id)) {
        const miEvaluacion = misEvaluaciones.find((e) => e.edicionId === ed.id);
        if (miEvaluacion) {
          resultado.push({ edicion: ed, tipo: miEvaluacion.tipo, evaluacion: miEvaluacion });
        }
        continue;
      }

      if (ed.unidadAcademicaId === usuario.unidadAcademicaId) {
        if (!propiosEvaluados.has(ed.id)) {
          resultado.push({ edicion: ed, tipo: TipoEvaluacionCruzada.Propia, evaluacion: null });
        }
      } else if (uaEmparejada && ed.unidadAcademicaId === uaEmparejada) {
        if (!ajenosEvaluados.has(ed.id)) {
          resultado.push({ edicion: ed, tipo: TipoEvaluacionCruzada.Ajena, evaluacion: null });
        }
      }
    }

    for (const evaluacion of misEvaluaciones) {
      if (evaluacion.tipo !== TipoEvaluacionCruzada.TerceraUa) continue;
      if (resultado.some((r) => r.edicion.id === evaluacion.edicionId)) continue;
      const ed = ediciones.find((x) => x.id === evaluacion.edicionId);
      if (ed) {
        resultado.push({ edicion: ed, tipo: TipoEvaluacionCruzada.TerceraUa, evaluacion });
      }
    }

    let filtradas = resultado;

    if (dto.search) {
      const termino = dto.search.toLowerCase();
      filtradas = filtradas.filter((r) =>
        (r.edicion.proyecto?.nombre ?? '').toLowerCase().includes(termino),
      );
    }
    if (dto.estado) {
      filtradas = filtradas.filter((r) => {
        if (dto.estado === 'sin_evaluar') return r.evaluacion === null;
        if (dto.estado === 'borrador') return r.evaluacion?.estado === EstadoEvaluacion.Borrador;
        if (dto.estado === 'confirmada')
          return r.evaluacion?.estado === EstadoEvaluacion.Confirmada;
        return true;
      });
    }

    const total = filtradas.length;
    const pagina = filtradas.slice((page - 1) * limit, page * limit);

    return {
      data: pagina,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async obtenerCruzada(convocatoriaId: string, edicionId: string, usuario: Usuario) {
    const { convocatoria } = await this.validarEdicionParaCruzada(
      convocatoriaId,
      edicionId,
      usuario,
    );

    const template = convocatoria.templateEvaluacionCruzada;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación cruzada',
      );
    }

    const evaluacion = await this.cruzadaRepo.findOne({
      where: { edicionId, evaluadorId: usuario.id },
      relations: { edicion: { proyecto: true }, evaluador: true, actualizadoPor: true },
    });

    return { evaluacion, template };
  }

  async historialCruzada(convocatoriaId: string, edicionId: string, usuario: Usuario) {
    await this.validarEdicionParaCruzada(convocatoriaId, edicionId, usuario);

    const evaluacion = await this.cruzadaRepo.findOne({
      where: { edicionId, evaluadorId: usuario.id },
      select: { id: true },
    });
    if (!evaluacion) return [];

    const registros = await this.auditoria.listarPorEntidad(
      TipoEntidadAuditoria.EVALUACION_CRUZADA,
      evaluacion.id,
    );
    return registros.map((r) => ({
      fecha: r.fecha,
      accion: r.accion,
      descripcion: r.descripcion,
      usuarioId: r.usuarioId,
      usuarioNombre: r.usuario?.nombreCompleto ?? r.responsableNombre,
    }));
  }

  async guardarCruzada(
    convocatoriaId: string,
    edicionId: string,
    dto: GuardarEvaluacionCruzadaDto,
    usuario: Usuario,
  ) {
    const { convocatoria, edicion, tipo } = await this.validarEdicionParaCruzada(
      convocatoriaId,
      edicionId,
      usuario,
    );

    const template = convocatoria.templateEvaluacionCruzada;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación cruzada',
      );
    }

    validarRespuestasCruzadas(template.estructura, dto.items);

    let evaluacion = await this.cruzadaRepo.findOne({
      where: { edicionId, evaluadorId: usuario.id },
    });
    if (evaluacion && evaluacion.estado === EstadoEvaluacion.Confirmada) {
      throw new BadRequestException('La evaluación ya fue confirmada y no puede modificarse');
    }

    if (!evaluacion) {
      if (tipo === TipoEvaluacionCruzada.Propia) {
        const otra = await this.cruzadaRepo.findOne({
          where: { edicionId, tipo: TipoEvaluacionCruzada.Propia },
        });
        if (otra) {
          throw new BadRequestException(
            'La edición ya tiene una evaluación propia de tu Unidad Académica',
          );
        }
      } else if (tipo === TipoEvaluacionCruzada.Ajena) {
        const otra = await this.cruzadaRepo.findOne({
          where: { edicionId, tipo: TipoEvaluacionCruzada.Ajena },
        });
        if (otra) {
          throw new BadRequestException(
            'La edición ya tiene una evaluación ajena de la Unidad Académica emparejada',
          );
        }
      }

      evaluacion = this.cruzadaRepo.create({
        convocatoriaId,
        edicionId,
        evaluadorId: usuario.id,
        tipo,
        templateId: template.id,
        estado: EstadoEvaluacion.Borrador,
        actualizadoPorId: usuario.id,
      });
    }

    if (dto.items !== undefined) evaluacion.items = dto.items;
    if (dto.observaciones !== undefined) evaluacion.observaciones = dto.observaciones;
    evaluacion.actualizadoPorId = usuario.id;
    const guardado = await this.cruzadaRepo.save(evaluacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EVALUACION,
      descripcion: `Guardó la evaluación cruzada (${tipo})`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.EVALUACION_CRUZADA,
      entidadId: guardado.id,
    });

    return {
      evaluacion: guardado,
      template,
      edicion: { id: edicion.id, proyectoId: edicion.proyectoId },
    };
  }

  async confirmarCruzada(convocatoriaId: string, edicionId: string, usuario: Usuario) {
    const { convocatoria } = await this.validarEdicionParaCruzada(
      convocatoriaId,
      edicionId,
      usuario,
    );

    const template = convocatoria.templateEvaluacionCruzada;
    if (!template) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación cruzada',
      );
    }

    const evaluacion = await this.cruzadaRepo.findOne({
      where: { edicionId, evaluadorId: usuario.id },
    });
    if (!evaluacion) throw new NotFoundException('La evaluación cruzada no existe todavía');
    if (evaluacion.estado === EstadoEvaluacion.Confirmada) {
      throw new BadRequestException('La evaluación ya fue confirmada');
    }

    this.validarCompletitudCruzada(template.estructura, evaluacion);

    evaluacion.estado = EstadoEvaluacion.Confirmada;
    const guardado = await this.cruzadaRepo.save(evaluacion);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EVALUACION,
      descripcion: `Confirmó la evaluación cruzada (${evaluacion.tipo})`,
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.EVALUACION_CRUZADA,
      entidadId: guardado.id,
    });

    return guardado;
  }

  private async validarEvaluadorAprobado(convocatoriaId: string, usuarioId: string): Promise<void> {
    const participacion = await this.participacionRepo.findOne({
      where: {
        usuarioId,
        convocatoriaId,
        rol: RolEjecucion.Evaluador,
        estado: EstadoPropuestaEvaluador.Aprobado,
      },
    });
    if (!participacion) {
      throw new ForbiddenException('Solo evaluadores aprobados de la convocatoria pueden evaluar');
    }
  }

  private async obtenerUaEmparejada(convocatoriaId: string, uaId: string): Promise<string | null> {
    const par = await this.emparejamientoRepo.findOne({
      where: [{ unidadAId: uaId }, { unidadBId: uaId }],
    });
    if (!par) return null;
    return par.unidadAId === uaId ? par.unidadBId : par.unidadAId;
  }

  private async edicionesConConflicto(
    usuarioId: string,
    convocatoriaId: string,
  ): Promise<Set<string>> {
    const creadas = await this.edicionRepo.find({
      where: { creadoPorId: usuarioId, convocatoriaId },
      select: { id: true },
    });
    const participaciones = await this.participacionRepo.find({
      where: { usuarioId, convocatoriaId },
      select: { edicionId: true },
    });
    const ids = new Set<string>(creadas.map((e) => e.id));
    for (const p of participaciones) {
      if (p.edicionId) ids.add(p.edicionId);
    }
    return ids;
  }

  private async validarEdicionParaCruzada(
    convocatoriaId: string,
    edicionId: string,
    usuario: Usuario,
  ): Promise<{ convocatoria: Convocatoria; edicion: Edicion; tipo: TipoEvaluacionCruzada }> {
    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionCruzada: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.estado !== EstadoConvocatoria.Evaluacion) {
      throw new BadRequestException('La convocatoria no está en etapa de evaluación');
    }
    await this.validarEvaluadorAprobado(convocatoriaId, usuario.id);

    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId, convocatoriaId },
      relations: { proyecto: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');

    const conflictos = await this.edicionesConConflicto(usuario.id, convocatoriaId);
    if (conflictos.has(edicion.id)) {
      throw new ForbiddenException('No podés evaluar un proyecto en el que participás');
    }

    const uaEmparejada = await this.obtenerUaEmparejada(convocatoriaId, usuario.unidadAcademicaId);
    const tipo = await this.tipoParaEdicion(convocatoriaId, edicion, usuario, uaEmparejada);
    if (!tipo) {
      throw new ForbiddenException(
        'Esta edición no corresponde a tu Unidad Académica ni a la emparejada',
      );
    }

    return { convocatoria, edicion, tipo };
  }

  private async tipoParaEdicion(
    convocatoriaId: string,
    edicion: Edicion,
    usuario: Usuario,
    uaEmparejada: string | null,
  ): Promise<TipoEvaluacionCruzada | null> {
    if (edicion.unidadAcademicaId === usuario.unidadAcademicaId) {
      return TipoEvaluacionCruzada.Propia;
    }
    if (uaEmparejada && edicion.unidadAcademicaId === uaEmparejada) {
      return TipoEvaluacionCruzada.Ajena;
    }
    const designada = await this.cruzadaRepo.findOne({
      where: {
        evaluadorId: usuario.id,
        edicionId: edicion.id,
        tipo: TipoEvaluacionCruzada.TerceraUa,
      },
    });
    if (designada) return TipoEvaluacionCruzada.TerceraUa;
    return null;
  }

  private validarCompletitudCruzada(
    estructura: EstructuraTemplateCruzada | null | undefined,
    evaluacion: EvaluacionCruzada,
  ): void {
    const items = (evaluacion.items ?? {}) as Record<string, unknown>;
    const faltantes: string[] = [];
    for (const categoria of estructura?.categorias ?? []) {
      for (const item of categoria.items) {
        if (items[item.id] === undefined || items[item.id] === null) {
          faltantes.push(item.nombre);
        }
      }
    }
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `La evaluación está incompleta. Faltan puntajes: ${faltantes.join(', ')}`,
      );
    }
  }

  // ───────────── Tercera Unidad Académica de resolución ─────────────

  // Candidatos para la tercera UA: evaluadores aprobados de la convocatoria
  // cuya Unidad Académica no sea la del proyecto ni la emparejada, y que no
  // tengan ya una evaluación sobre la edición.
  async listarCandidatosTercera(convocatoriaId: string, edicionId: string) {
    const edicion = await this.edicionRepo.findOne({ where: { id: edicionId, convocatoriaId } });
    if (!edicion) throw new NotFoundException('Edición no encontrada');

    const uaEmparejada = await this.obtenerUaEmparejada(convocatoriaId, edicion.unidadAcademicaId);

    const participaciones = await this.participacionRepo.find({
      where: {
        convocatoriaId,
        rol: RolEjecucion.Evaluador,
        estado: EstadoPropuestaEvaluador.Aprobado,
      },
      relations: { usuario: { unidadAcademica: true } },
    });

    const evaluacionesEnEdicion = await this.cruzadaRepo.find({
      where: { edicionId },
      select: { evaluadorId: true },
    });
    const evaluadoresEnEdicion = new Set(evaluacionesEnEdicion.map(e => e.evaluadorId));

    return participaciones
      .filter(p => {
        const ua = p.usuario.unidadAcademicaId;
        if (ua === edicion.unidadAcademicaId) return false;
        if (uaEmparejada && ua === uaEmparejada) return false;
        if (evaluadoresEnEdicion.has(p.usuarioId)) return false;
        return true;
      })
      .map(p => ({
        id: p.usuario.id,
        nombreCompleto: p.usuario.nombreCompleto,
        email: p.usuario.email,
        unidadAcademica: p.usuario.unidadAcademica
          ? { id: p.usuario.unidadAcademica.id, nombre: p.usuario.unidadAcademica.nombre }
          : null,
      }));
  }

  async designarTercera(
    convocatoriaId: string,
    edicionId: string,
    evaluadorId: string,
    usuario: Usuario,
  ) {
    if (
      !usuario.roles.some(
        (r) => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
      )
    ) {
      throw new ForbiddenException('Solo el Rectorado puede designar la tercera Unidad Académica');
    }

    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionCruzada: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    if (convocatoria.estado !== EstadoConvocatoria.Evaluacion) {
      throw new BadRequestException('La convocatoria no está en etapa de evaluación');
    }
    if (!convocatoria.templateEvaluacionCruzada) {
      throw new BadRequestException(
        'La convocatoria no tiene configurado el formulario de evaluación cruzada',
      );
    }

    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId, convocatoriaId },
      relations: { proyecto: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');
    if (edicion.estado !== EstadoEdicion.EnEvaluacion) {
      throw new BadRequestException(
        'Solo las ediciones en evaluación pueden recibir una tercera designación',
      );
    }

    const participacion = await this.participacionRepo.findOne({
      where: {
        usuarioId: evaluadorId,
        convocatoriaId,
        rol: RolEjecucion.Evaluador,
        estado: EstadoPropuestaEvaluador.Aprobado,
      },
      relations: { usuario: { unidadAcademica: true } },
    });
    if (!participacion) {
      throw new ForbiddenException('Solo evaluadores aprobados de la convocatoria pueden evaluar');
    }

    const uaEmparejada = await this.obtenerUaEmparejada(convocatoriaId, edicion.unidadAcademicaId);
    const uaEvaluador = participacion.usuario.unidadAcademicaId;
    if (uaEvaluador === edicion.unidadAcademicaId || (uaEmparejada && uaEvaluador === uaEmparejada)) {
      throw new BadRequestException(
        'El evaluador debe pertenecer a una Unidad Académica distinta de la del proyecto y de la emparejada',
      );
    }

    const existente = await this.cruzadaRepo.findOne({
      where: { edicionId, tipo: TipoEvaluacionCruzada.TerceraUa },
    });
    if (existente) {
      throw new BadRequestException('La edición ya tiene designada una tercera Unidad Académica');
    }

    const previa = await this.cruzadaRepo.findOne({
      where: { edicionId, evaluadorId },
    });
    if (previa) {
      throw new BadRequestException(
        'El evaluador ya tiene una evaluación asignada sobre esta edición',
      );
    }

    const evaluacion = await this.cruzadaRepo.save(
      this.cruzadaRepo.create({
        convocatoriaId,
        edicionId,
        evaluadorId,
        tipo: TipoEvaluacionCruzada.TerceraUa,
        templateId: convocatoria.templateEvaluacionCruzada.id,
        estado: EstadoEvaluacion.Borrador,
      }),
    );

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      accion: TipoAccionAuditoria.EVALUACION,
      descripcion: 'Designó un evaluador como tercera Unidad Académica',
      responsableId: usuario.id,
      responsableNombre: usuario.nombreCompleto,
      entidad: TipoEntidadAuditoria.EVALUACION_CRUZADA,
      entidadId: evaluacion.id,
    });

    return evaluacion;
  }
}
