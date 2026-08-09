import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Convocatoria } from './convocatoria.entity';
import { CrearConvocatoriaDto } from './dto/crear-convocatoria.dto';
import { ActualizarConvocatoriaDto } from './dto/actualizar-convocatoria.dto';
import { GuardarEmparejamientoDto } from './dto/guardar-emparejamiento.dto';
import { GuardarFormularioDto } from './dto/guardar-formulario.dto';
import { GuardarEstructuraInstitucionalDto, GuardarEstructuraCruzadaDto } from './dto/guardar-estructura-template.dto';
import { Emparejamiento } from './emparejamiento.entity';
import { Formulario } from '../formularios/formulario.entity';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { validarFechasConvocatoria } from '../common/dto/validador-fechas-convocatoria';
import { validarCamposFormulario } from '../common/dto/validador-campos-formulario';
import {
  validarEstructuraInstitucional,
  validarEstructuraCruzada,
} from '../common/dto/validador-estructura-evaluacion';

@Injectable()
export class ConvocatoriasService {
  constructor(
    @InjectRepository(Convocatoria)
    private readonly repo: Repository<Convocatoria>,
    @InjectRepository(Formulario)
    private readonly formularioRepo: Repository<Formulario>,
    @InjectRepository(Emparejamiento)
    private readonly emparejamientoRepo: Repository<Emparejamiento>,
    @InjectRepository(UnidadAcademica)
    private readonly uaRepo: Repository<UnidadAcademica>,
    @InjectRepository(TemplateEvaluacionInstitucional)
    private readonly templateInstitucionalRepo: Repository<TemplateEvaluacionInstitucional>,
    @InjectRepository(TemplateEvaluacionCruzada)
    private readonly templateCruzadaRepo: Repository<TemplateEvaluacionCruzada>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
  ) {}

  listar() {
    return this.repo.find({ order: { fechaInicioPresentacion: 'DESC' }, relations: { formulario: true } });
  }

  obtener(id: string) {
    return this.repo.findOne({ where: { id }, relations: { formulario: true } });
  }

  async crear(dto: CrearConvocatoriaDto, _usuario: Usuario) {
    validarFechasConvocatoria(dto);
    const convocatoria = this.repo.create(dto);
    return this.repo.save(convocatoria);
  }

  async actualizar(id: string, dto: ActualizarConvocatoriaDto, _usuario: Usuario) {
    const convocatoria = await this.repo.findOne({ where: { id }, relations: { formulario: true } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    validarFechasConvocatoria({
      fechaInicioPresentacion: dto.fechaInicioPresentacion ?? convocatoria.fechaInicioPresentacion,
      fechaFinPresentacion: dto.fechaFinPresentacion ?? convocatoria.fechaFinPresentacion,
      fechaInicioEvaluacion: dto.fechaInicioEvaluacion ?? convocatoria.fechaInicioEvaluacion,
      fechaFinEvaluacion: dto.fechaFinEvaluacion ?? convocatoria.fechaFinEvaluacion,
      fechaInicioEjecucion: dto.fechaInicioEjecucion ?? convocatoria.fechaInicioEjecucion,
      fechaFinEjecucion: dto.fechaFinEjecucion ?? convocatoria.fechaFinEjecucion,
    });

    const estadoAnterior = convocatoria.estado;
    Object.assign(convocatoria, dto);
    const convocatoriaGuardada = await this.repo.save(convocatoria);

    if (
      estadoAnterior === EstadoConvocatoria.Configuracion &&
      convocatoriaGuardada.estado !== EstadoConvocatoria.Configuracion
    ) {
      await this.congelarTemplatesSiCompartidos(convocatoria.id);
    }

    if (
      convocatoriaGuardada.estado === EstadoConvocatoria.Evaluacion &&
      estadoAnterior !== EstadoConvocatoria.Evaluacion
    ) {
      await this.edicionRepo
        .createQueryBuilder()
        .update(Edicion)
        .set({ estado: EstadoEdicion.EnEvaluacion })
        .where('convocatoriaId = :convocatoriaId', { convocatoriaId: convocatoria.id })
        .andWhere('estado IN (:...estados)', {
          estados: [EstadoEdicion.Presentado, EstadoEdicion.PendienteDeCambios],
        })
        .andWhere('eliminadoEn IS NULL')
        .execute();
    }

    return convocatoriaGuardada;
  }

  async eliminar(id: string, _usuario: Usuario) {
    const convocatoria = await this.repo.findOne({ where: { id } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    return this.repo.remove(convocatoria);
  }

  async obtenerEmparejamientos(convocatoriaId: string) {
    return this.emparejamientoRepo.find({
      where: { convocatoriaId },
      relations: { unidadA: true, unidadB: true },
    });
  }

  async guardarEmparejamientos(convocatoriaId: string, dto: GuardarEmparejamientoDto) {
    const convocatoria = await this.repo.findOne({ where: { id: convocatoriaId } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    const todasLasUAs = await this.uaRepo.find();
    const idsValidos = new Set(todasLasUAs.map(ua => ua.id));
    const uasUsadas = new Map<string, string>();

    for (const par of dto.pares) {
      if (!idsValidos.has(par.unidadAId)) {
        throw new BadRequestException(`UA inválida: ${par.unidadAId}`);
      }
      if (!idsValidos.has(par.unidadBId)) {
        throw new BadRequestException(`UA inválida: ${par.unidadBId}`);
      }
      if (par.unidadAId === par.unidadBId) {
        throw new BadRequestException('Una UA no puede emparejarse consigo misma');
      }

      if (uasUsadas.has(par.unidadAId)) {
        throw new BadRequestException(`La UA ${par.unidadAId} ya está emparejada más de una vez`);
      }
      if (uasUsadas.has(par.unidadBId)) {
        throw new BadRequestException(`La UA ${par.unidadBId} ya está emparejada más de una vez`);
      }

      uasUsadas.set(par.unidadAId, par.unidadBId);
      uasUsadas.set(par.unidadBId, par.unidadAId);
    }

    await this.emparejamientoRepo.delete({ convocatoriaId });

    const nuevos = dto.pares.map(par =>
      this.emparejamientoRepo.create({
        convocatoriaId,
        unidadAId: par.unidadAId,
        unidadBId: par.unidadBId,
      }),
    );

    return this.emparejamientoRepo.save(nuevos);
  }

  async obtenerFormulario(convocatoriaId: string): Promise<Formulario> {
    const convocatoria = await this.repo.findOne({
      where: { id: convocatoriaId },
      relations: { formulario: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    if (convocatoria.formulario) return convocatoria.formulario;

    return { id: '', nombre: '', esDefault: false, esPlantilla: false, campos: [] } as Formulario;
  }

  async guardarFormulario(convocatoriaId: string, dto: GuardarFormularioDto): Promise<Formulario> {
    const convocatoria = await this.repo.findOne({
      where: { id: convocatoriaId },
      relations: { formulario: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    if (convocatoria.estado !== EstadoConvocatoria.Configuracion) {
      throw new BadRequestException(
        'El formulario solo puede editarse mientras la convocatoria está en etapa de configuración',
      );
    }

    validarCamposFormulario(dto.campos);

    const campos = dto.campos.map((campo, index) => ({
      id: campo.id || crypto.randomUUID(),
      tipo: campo.tipo,
      nombre: campo.nombre.trim(),
      textoAyuda: campo.textoAyuda?.trim() || undefined,
      esObligatorio: campo.esObligatorio,
      orden: index,
      opciones: campo.opciones?.map((o) => o.trim()).filter(Boolean),
    }));

    let formulario = convocatoria.formulario;
    if (!formulario) {
      formulario = this.formularioRepo.create({
        nombre: `Formulario ${convocatoria.nombre}`,
        esDefault: false,
      });
    }
    formulario.campos = campos;
    const guardado = await this.formularioRepo.save(formulario);

    if (convocatoria.formularioId !== guardado.id) {
      convocatoria.formularioId = guardado.id;
      convocatoria.formulario = guardado;
      await this.repo.save(convocatoria);
    }

    return guardado;
  }

  // ───────────── Templates de evaluación ─────────────

  async obtenerTemplateInstitucional(convocatoriaId: string): Promise<TemplateEvaluacionInstitucional> {
    const convocatoria = await this.repo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionInstitucional: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    if (convocatoria.templateEvaluacionInstitucional) {
      return convocatoria.templateEvaluacionInstitucional;
    }

    return {
      id: '',
      nombre: '',
      esDefault: false,
      esPlantilla: false,
      estructura: null,
    } as TemplateEvaluacionInstitucional;
  }

  async guardarTemplateInstitucional(
    convocatoriaId: string,
    dto: GuardarEstructuraInstitucionalDto,
  ): Promise<TemplateEvaluacionInstitucional> {
    const convocatoria = await this.repo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionInstitucional: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    if (convocatoria.estado !== EstadoConvocatoria.Configuracion) {
      throw new BadRequestException(
        'El template de evaluación institucional solo puede editarse mientras la convocatoria está en etapa de configuración',
      );
    }

    validarEstructuraInstitucional(dto.estructura);

    let template = convocatoria.templateEvaluacionInstitucional;
    if (!template || template.esPlantilla) {
      // Copy-on-write: si no tiene template o apunta a uno compartido de la biblioteca
      // (default/plantilla), crear una copia privada propia para no modificarlo.
      template = this.templateInstitucionalRepo.create({
        nombre: `Evaluación institucional ${convocatoria.nombre}`,
        esDefault: false,
        esPlantilla: false,
        estructura: template?.estructura ?? null,
      });
    }
    template.estructura = dto.estructura ?? null;
    const guardado = await this.templateInstitucionalRepo.save(template);

    if (convocatoria.templateEvaluacionInstitucionalId !== guardado.id) {
      convocatoria.templateEvaluacionInstitucionalId = guardado.id;
      convocatoria.templateEvaluacionInstitucional = guardado;
      await this.repo.save(convocatoria);
    }

    return guardado;
  }

  async obtenerTemplateCruzada(convocatoriaId: string): Promise<TemplateEvaluacionCruzada> {
    const convocatoria = await this.repo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionCruzada: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    if (convocatoria.templateEvaluacionCruzada) {
      return convocatoria.templateEvaluacionCruzada;
    }

    return {
      id: '',
      nombre: '',
      esDefault: false,
      esPlantilla: false,
      estructura: null,
    } as TemplateEvaluacionCruzada;
  }

  async guardarTemplateCruzada(
    convocatoriaId: string,
    dto: GuardarEstructuraCruzadaDto,
  ): Promise<TemplateEvaluacionCruzada> {
    const convocatoria = await this.repo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionCruzada: true },
    });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');

    if (convocatoria.estado !== EstadoConvocatoria.Configuracion) {
      throw new BadRequestException(
        'El template de evaluación cruzada solo puede editarse mientras la convocatoria está en etapa de configuración',
      );
    }

    validarEstructuraCruzada(dto.estructura);

    let template = convocatoria.templateEvaluacionCruzada;
    if (!template || template.esPlantilla) {
      // Copy-on-write: si no tiene template o apunta a uno compartido de la biblioteca
      // (default/plantilla), crear una copia privada propia para no modificarlo.
      template = this.templateCruzadaRepo.create({
        nombre: `Evaluación cruzada ${convocatoria.nombre}`,
        esDefault: false,
        esPlantilla: false,
        estructura: template?.estructura ?? null,
      });
    }
    template.estructura = dto.estructura ?? null;
    const guardado = await this.templateCruzadaRepo.save(template);

    if (convocatoria.templateEvaluacionCruzadaId !== guardado.id) {
      convocatoria.templateEvaluacionCruzadaId = guardado.id;
      convocatoria.templateEvaluacionCruzada = guardado;
      await this.repo.save(convocatoria);
    }

    return guardado;
  }

  // Al salir de Configuración la convocatoria "toma como propios" los templates que
  // estuviera compartiendo con la biblioteca: los congela en copias privadas
  // (esPlantilla: false, invisibles en la biblioteca e inmutables). Idempotente: si ya
  // apunta a templates privados no hace nada.
  private async congelarTemplatesSiCompartidos(convocatoriaId: string) {
    const convocatoria = await this.repo.findOne({
      where: { id: convocatoriaId },
      relations: { templateEvaluacionInstitucional: true, templateEvaluacionCruzada: true },
    });
    if (!convocatoria) return;

    let huboCambios = false;

    const inst = convocatoria.templateEvaluacionInstitucional;
    if (inst?.esPlantilla) {
      const copia = await this.templateInstitucionalRepo.save(
        this.templateInstitucionalRepo.create({
          nombre: `Evaluación institucional ${convocatoria.nombre}`,
          esDefault: false,
          esPlantilla: false,
          estructura: inst.estructura,
        }),
      );
      convocatoria.templateEvaluacionInstitucionalId = copia.id;
      convocatoria.templateEvaluacionInstitucional = copia;
      huboCambios = true;
    }

    const cruzada = convocatoria.templateEvaluacionCruzada;
    if (cruzada?.esPlantilla) {
      const copia = await this.templateCruzadaRepo.save(
        this.templateCruzadaRepo.create({
          nombre: `Evaluación cruzada ${convocatoria.nombre}`,
          esDefault: false,
          esPlantilla: false,
          estructura: cruzada.estructura,
        }),
      );
      convocatoria.templateEvaluacionCruzadaId = copia.id;
      convocatoria.templateEvaluacionCruzada = copia;
      huboCambios = true;
    }

    if (huboCambios) {
      await this.repo.save(convocatoria);
    }
  }
}
