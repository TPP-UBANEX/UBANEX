import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Convocatoria } from './convocatoria.entity';
import { CrearConvocatoriaDto } from './dto/crear-convocatoria.dto';
import { ActualizarConvocatoriaDto } from './dto/actualizar-convocatoria.dto';
import { Formulario } from '../formularios/formulario.entity';
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
}
