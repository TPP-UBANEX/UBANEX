import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Convocatoria } from './convocatoria.entity';
import { CrearConvocatoriaDto } from './dto/crear-convocatoria.dto';
import { ActualizarConvocatoriaDto } from './dto/actualizar-convocatoria.dto';
import { GuardarEmparejamientoDto } from './dto/guardar-emparejamiento.dto';
import { Emparejamiento } from './emparejamiento.entity';
import { Formulario } from '../formularios/formulario.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { validarFechasConvocatoria } from '../common/dto/validador-fechas-convocatoria';

function hoyVersion(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `version ${dd}-${mm}-${yyyy}`;
}

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
  ) {}

  listar() {
    return this.repo.find({ order: { fechaInicioPresentacion: 'DESC' }, relations: { formulario: true } });
  }

  obtener(id: string) {
    return this.repo.findOne({ where: { id }, relations: { formulario: true } });
  }

  async crear(dto: CrearConvocatoriaDto, _usuario: Usuario) {
    validarFechasConvocatoria(dto);
    const { formularioId, ...rest } = dto;
    const convocatoria = this.repo.create(rest);

    if (formularioId) {
      const plantilla = await this.formularioRepo.findOne({ where: { id: formularioId } });
      if (plantilla) {
        const copia = this.formularioRepo.create({ nombre: `${plantilla.nombre} (${hoyVersion()})`, esDefault: false });
        const guardado = await this.formularioRepo.save(copia);
        convocatoria.formularioId = guardado.id;
        convocatoria.formulario = guardado;
      }
    }

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

    const { formularioId, ...rest } = dto;

    if (formularioId && formularioId !== convocatoria.formularioId) {
      const viejo = convocatoria.formulario;
      convocatoria.formulario = null;
      convocatoria.formularioId = null;
      await this.repo.save(convocatoria);
      if (viejo) {
        await this.formularioRepo.remove(viejo);
      }
      const plantilla = await this.formularioRepo.findOne({ where: { id: formularioId } });
      if (plantilla) {
        const copia = this.formularioRepo.create({ nombre: `${plantilla.nombre} (${hoyVersion()})`, esDefault: false });
        const guardado = await this.formularioRepo.save(copia);
        convocatoria.formularioId = guardado.id;
        convocatoria.formulario = guardado;
      }
    }

    Object.assign(convocatoria, rest);
    return this.repo.save(convocatoria);
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
}
