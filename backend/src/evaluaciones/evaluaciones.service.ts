import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluacionInstitucional } from './evaluacion-institucional.entity';
import { EvaluacionCruzada } from './evaluacion-cruzada.entity';
import { GuardarEvaluacionInstitucionalDto } from './dto/guardar-evaluacion-institucional.dto';
import { GuardarEvaluacionCruzadaDto } from './dto/guardar-evaluacion-cruzada.dto';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { EstadoPropuestaEvaluador } from '../common/enums/estado-propuesta-evaluador.enum';
import { TipoEvaluacionCruzada } from '../common/enums/tipo-evaluacion-cruzada.enum';
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
// cruzadas confirmadas más la evaluación institucional confirmada. Cada "Sí"
// del formulario suma PUNTAJE_BOOLEANO puntos. La asignación de fondos la
// define el presupuesto + cupo, no un umbral de nota.
const PUNTAJE_BOOLEANO = 10;

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
    @InjectRepository(Emparejamiento)
    private readonly emparejamientoRepo: Repository<Emparejamiento>,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly participacionRepo: Repository<ParticipacionConvocatoria>,
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
      ediciones: ediciones.map((ed) => {
        const inst = instPorEdicion.get(ed.id) ?? null;
        return {
          edicion: ed,
          institucional: inst
            ? {
                id: inst.id,
                estado: inst.estado,
                observaciones: inst.observaciones,
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
      }),
    };
  }

  // Resumen de la evaluación de una edición para su director y las autoridades.
  // Durante el proceso solo se expone el estado; los detalles (valoraciones,
  // fundamentaciones, observaciones y puntajes) se muestran una vez confirmados.
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

    const subcategorias = (estructuraInst.categorias ?? []).flatMap((c) => c.subcategorias ?? []);
    const respuestas = (institucional.categorias ?? {}) as Record<string, { valor?: unknown }>;
    const maxInst = subcategorias.reduce<number>((suma, sub) => {
      if (sub.tipoValor === 'numerico') return suma + (sub.maximo ?? PUNTAJE_BOOLEANO);
      return suma + PUNTAJE_BOOLEANO;
    }, 0);
    const puntajeInst = subcategorias.reduce<number>((suma, sub) => {
      const respuesta = respuestas[sub.id]?.valor;
      if (sub.tipoValor === 'numerico') return suma + Number(respuesta ?? 0);
      return suma + (respuesta === true ? PUNTAJE_BOOLEANO : 0);
    }, 0);

    const maxCruzada = (estructuraCruzada.categorias ?? [])
      .flatMap((c) => c.items ?? [])
      .reduce<number>((suma, item) => suma + (item.puntajeMaximo ?? 0), 0);
    const promedioCruzada =
      cruzadasConfirmadas.reduce<number>((suma, c) => {
        const items = (c.items ?? {}) as Record<string, number>;
        const total = Object.values(items).reduce<number>((acc, v) => acc + Number(v), 0);
        return suma + total;
      }, 0) / cruzadasConfirmadas.length;

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

  // Genera el orden de mérito automático de una convocatoria: rankea las
  // ediciones por notaFinal (suma del promedio de evaluaciones cruzadas y la
  // evaluación institucional) y propone una adjudicación borrador (no
  // definitiva) respetando el cupo
  // mínimo por unidad académica. No pisa el ordenMerito ya seteado a mano.
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

    const ediciones = await this.edicionRepo.find({
      where: { convocatoriaId },
      relations: {
        proyecto: true,
        unidadAcademica: true,
        convocatoria: {
          templateEvaluacionInstitucional: true,
          templateEvaluacionCruzada: true,
        },
      },
    });
    const institucionales = await this.institucionalRepo.find({ where: { convocatoriaId } });
    const cruzadas = await this.cruzadaRepo.find({ where: { convocatoriaId } });

    const instPorEdicion = new Map(institucionales.map((i) => [i.edicionId, i]));
    const cruzadasPorEdicion = new Map<string, EvaluacionCruzada[]>();
    for (const c of cruzadas) {
      const arr = cruzadasPorEdicion.get(c.edicionId) ?? [];
      arr.push(c);
      cruzadasPorEdicion.set(c.edicionId, arr);
    }

    // El orden de mérito solo se genera si TODAS las ediciones que están en la
    // etapa de evaluación fueron evaluadas (institucional confirmada + al
    // menos una cruzada confirmada). Si falta alguna, se bloquea la operación.
    const sinEvaluar = ediciones.filter((ed) => {
      if (ed.estado !== EstadoEdicion.EnEvaluacion) return false;
      const inst = instPorEdicion.get(ed.id) ?? null;
      const tieneInst = !!inst && inst.estado === EstadoEvaluacion.Confirmada;
      const tieneCruzada = (cruzadasPorEdicion.get(ed.id) ?? []).some(
        (c) => c.estado === EstadoEvaluacion.Confirmada,
      );
      return !tieneInst || !tieneCruzada;
    });
    if (sinEvaluar.length > 0) {
      throw new BadRequestException(
        'No se puede generar el orden de mérito: hay proyectos en evaluación que aún no fueron evaluados',
      );
    }

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

    const ordenCmp = (a: number | null, b: number | null): number => {
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    };

    // Rankear por notaFinal desc (tie-break: checklist completo, luego id),
    // solo las ediciones sin ordenMerito seteado (preserva los manuales).
    const elegibles = ediciones
      .filter((ed) => ed.ordenMerito === null)
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

    // Ediciones con ordenMerito ya asignado al inicio: son manuales y no deben
    // ser pisadas por el cálculo automático (se capturan antes de reordenar).
    const manuales = new Set(ediciones.filter((e) => e.ordenMerito !== null).map((e) => e.id));

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

    // Propuesta de adjudicación borrador, limitada por el presupuesto, con
    // prioridad de MÉRITO GLOBAL y un piso de CUPO por unidad académica.
    //
    // Algoritmo en 3 fases:
    //   Fase A — Mérito global: se financian los mejores proyectos de toda la
    //            convocatoria (sin importar UA) MIENTRAS el saldo restante siga
    //            alcanzando para cubrir el cupo pendiente de todas las UAs.
    //   Fase B — Cupo balanceado: si hace falta, se garantiza el piso de
    //            `cupo` proyectos por UA vía round-robin rotado.
    //   Fase C — Mérito global para el excedente que quede tras cubrir cupos.
    const propuesta = new Map<string, boolean>();
    const costo = (ed: Edicion): number => Number(ed.presupuesto?.montoTotal ?? 0);

    // Solo las ediciones automáticas (ordenMerito === null) con evaluación
    // confirmada participan del cálculo; las manuales se preservan.
    const elegiblesConPuntaje = elegibles.filter(({ p }) => p !== null).map(({ ed }) => ed);

    // Listas por UA ordenadas por mérito (mejor primero).
    const listasPorUA = new Map<string, Edicion[]>();
    for (const ed of elegiblesConPuntaje) {
      const arr = listasPorUA.get(ed.unidadAcademicaId) ?? [];
      arr.push(ed);
      listasPorUA.set(ed.unidadAcademicaId, arr);
    }
    for (const lista of listasPorUA.values()) {
      lista.sort((a, b) => ordenCmp(a.ordenMerito, b.ordenMerito));
    }
    const uas = [...listasPorUA.keys()];

    // Presupuesto disponible: null significa "sin límite" (comportamiento previo).
    const presupuestoTotal = convocatoria.presupuestoTotal;
    let disponible: number | null = presupuestoTotal != null ? Number(presupuestoTotal) : null;
    const descontar = (monto: number): void => {
      if (disponible != null) {
        disponible = Math.max(0, Math.round((disponible - monto) * 100) / 100);
      }
    };
    // Cantidad de proyectos admitidos por UA (para saber cupos pendientes).
    const admitidosUA = new Map<string, number>();
    for (const ua of uas) admitidosUA.set(ua, 0);

    const cupo = convocatoria.cupoMinimoPorUnidadAcademica ?? 0;

    const admitir = (ed: Edicion): void => {
      propuesta.set(ed.id, true);
      descontar(costo(ed));
      admitidosUA.set(ed.unidadAcademicaId, (admitidosUA.get(ed.unidadAcademicaId) ?? 0) + 1);
    };

    // Reserva de cupo (peor caso): por cada UA con cupo pendiente, se suma el
    // costo de sus `cupo - yaAdmitidos` proyectos MÁS CAROS aún disponibles. Así
    // se garantiza el piso aunque el proyecto de mayor mérito sea el más caro.
    const reservaCupos = (): number => {
      let total = 0;
      for (const ua of uas) {
        const pend = cupo - (admitidosUA.get(ua) ?? 0);
        if (pend <= 0) continue;
        const costos = listasPorUA
          .get(ua)!
          .filter((ed) => !propuesta.get(ed.id))
          .map((ed) => costo(ed))
          .sort((a, b) => b - a)
          .slice(0, pend);
        total += costos.reduce((s, v) => s + v, 0);
      }
      return total;
    };

    // FASE A — Mérito global mientras alcance la reserva de cupo (peor caso).
    const porMerito = [...elegiblesConPuntaje].sort(
      (a, b) => (b.puntajeMerito ?? 0) - (a.puntajeMerito ?? 0),
    );
    for (const ed of porMerito) {
      const costoEd = costo(ed);
      if (disponible == null) {
        admitir(ed);
        continue;
      }
      // Probar admisión y verificar que aún se pueda cubrir el cupo (peor caso).
      propuesta.set(ed.id, true);
      admitidosUA.set(ed.unidadAcademicaId, (admitidosUA.get(ed.unidadAcademicaId) ?? 0) + 1);
      const ok = disponible - costoEd >= reservaCupos();
      if (!ok) {
        propuesta.delete(ed.id);
        admitidosUA.set(ed.unidadAcademicaId, (admitidosUA.get(ed.unidadAcademicaId) ?? 0) - 1);
        continue;
      }
      descontar(costoEd);
    }

    // FASE B — Cupo balanceado (round-robin rotado, tope `cupo`).
    if (cupo > 0) {
      const ptr = new Map<string, number>();
      for (const ua of uas) ptr.set(ua, 0);
      let inicio = 0;
      let hayCambios = true;
      while (hayCambios) {
        hayCambios = false;
        const orden = [...uas.slice(inicio), ...uas.slice(0, inicio)];
        for (const ua of orden) {
          const lista = listasPorUA.get(ua)!;
          const yaAdmitidos = lista.filter((e) => propuesta.get(e.id)).length;
          if (yaAdmitidos >= cupo) continue;
          let i = ptr.get(ua)!;
          let ed: Edicion | undefined;
          while (i < lista.length) {
            const candidato = lista[i];
            const costoEd = costo(candidato);
            if (disponible == null || costoEd <= disponible) {
              ed = candidato;
              break;
            }
            i++;
          }
          if (!ed) {
            ptr.set(ua, lista.length);
            continue;
          }
          admitir(ed);
          ptr.set(ua, i + 1);
          hayCambios = true;
        }
        inicio = (inicio + 1) % uas.length;
      }
    }

    // FASE C — Mérito global para el excedente restante.
    const restantes = [...elegiblesConPuntaje]
      .filter((ed) => !propuesta.get(ed.id))
      .sort((a, b) => (b.puntajeMerito ?? 0) - (a.puntajeMerito ?? 0));
    for (const ed of restantes) {
      const costoEd = costo(ed);
      if (disponible != null && costoEd > disponible) continue;
      admitir(ed);
    }

    // Aplicar: automáticas según la propuesta; manuales (ya tenían ordenMerito
    // asignado al inicio) se preservan; sin evaluación -> null.
    for (const ed of ediciones) {
      if (manuales.has(ed.id)) continue;
      ed.adjudicacionPropuesta = puntajes.has(ed.id) ? (propuesta.get(ed.id) ?? false) : null;
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
    usuario: Usuario,
  ): Promise<Edicion> {
    this.validarEsRectorado(usuario);
    const edicion = await this.edicionRepo.findOne({
      where: { id: edicionId },
      relations: { proyecto: true, unidadAcademica: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');

    // Guarda de presupuesto: no se puede adjudicar si no alcanza para este proyecto.
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
        const adjudicadoSum = todas
          .filter((e) => e.adjudicacionPropuesta === true)
          .reduce((s, e) => s + Number(e.presupuesto?.montoTotal ?? 0), 0);
        const costo = Number(edicion.presupuesto?.montoTotal ?? 0);
        if (adjudicadoSum + costo > tope + 0.001) {
          throw new BadRequestException(
            'No hay presupuesto disponible para adjudicar este proyecto',
          );
        }
      }
    }

    edicion.adjudicacionPropuesta = adjudicado;
    return this.edicionRepo.save(edicion);
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

    await this.validarEvaluadorAprobado(convocatoriaId, evaluadorId);

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
