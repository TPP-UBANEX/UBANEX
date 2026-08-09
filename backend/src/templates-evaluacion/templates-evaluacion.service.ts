import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateEvaluacionInstitucional } from './template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from './template-evaluacion-cruzada.entity';
import { GuardarTemplateInstitucionalDto } from './dto/guardar-template-institucional.dto';
import { GuardarTemplateCruzadaDto } from './dto/guardar-template-cruzada.dto';
import {
  validarEstructuraInstitucional,
  validarEstructuraCruzada,
} from '../common/dto/validador-estructura-evaluacion';

@Injectable()
export class TemplatesEvaluacionService {
  constructor(
    @InjectRepository(TemplateEvaluacionInstitucional)
    private readonly institucionalRepo: Repository<TemplateEvaluacionInstitucional>,
    @InjectRepository(TemplateEvaluacionCruzada)
    private readonly cruzadaRepo: Repository<TemplateEvaluacionCruzada>,
  ) {}

  // ───────────── Institucional ─────────────

  listarInstitucionales() {
    return this.institucionalRepo.find({
      where: { esPlantilla: true },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerInstitucional(id: string): Promise<TemplateEvaluacionInstitucional> {
    const template = await this.institucionalRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template de evaluación institucional no encontrado');
    }
    return template;
  }

  async crearInstitucional(dto: GuardarTemplateInstitucionalDto) {
    validarEstructuraInstitucional(dto.estructura);
    await this.marcarUnicoDefaultInstitucional(dto.esDefault);
    return this.institucionalRepo.save(
      this.institucionalRepo.create({
        nombre: dto.nombre,
        esDefault: dto.esDefault ?? false,
        esPlantilla: true,
        estructura: dto.estructura ?? null,
      }),
    );
  }

  async actualizarInstitucional(id: string, dto: GuardarTemplateInstitucionalDto) {
    const template = await this.obtenerInstitucional(id);
    validarEstructuraInstitucional(dto.estructura);

    if (dto.nombre !== undefined) template.nombre = dto.nombre;
    if (dto.estructura !== undefined) template.estructura = dto.estructura;
    if (dto.esDefault !== undefined) {
      await this.marcarUnicoDefaultInstitucional(dto.esDefault, id);
      template.esDefault = dto.esDefault;
    }
    return this.institucionalRepo.save(template);
  }

  async eliminarInstitucional(id: string): Promise<void> {
    const template = await this.obtenerInstitucional(id);
    await this.institucionalRepo.remove(template);
  }

  private async marcarUnicoDefaultInstitucional(esDefault: boolean | undefined, exceptoId?: string) {
    if (!esDefault) return;
    const actual = await this.institucionalRepo.findOne({ where: { esDefault: true } });
    if (actual && actual.id !== exceptoId) {
      actual.esDefault = false;
      await this.institucionalRepo.save(actual);
    }
  }

  // ───────────── Cruzada ─────────────

  listarCruzadas() {
    return this.cruzadaRepo.find({
      where: { esPlantilla: true },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerCruzada(id: string): Promise<TemplateEvaluacionCruzada> {
    const template = await this.cruzadaRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template de evaluación cruzada no encontrado');
    }
    return template;
  }

  async crearCruzada(dto: GuardarTemplateCruzadaDto) {
    validarEstructuraCruzada(dto.estructura);
    await this.marcarUnicoDefaultCruzada(dto.esDefault);
    return this.cruzadaRepo.save(
      this.cruzadaRepo.create({
        nombre: dto.nombre,
        esDefault: dto.esDefault ?? false,
        esPlantilla: true,
        estructura: dto.estructura ?? null,
      }),
    );
  }

  async actualizarCruzada(id: string, dto: GuardarTemplateCruzadaDto) {
    const template = await this.obtenerCruzada(id);
    validarEstructuraCruzada(dto.estructura);

    if (dto.nombre !== undefined) template.nombre = dto.nombre;
    if (dto.estructura !== undefined) template.estructura = dto.estructura;
    if (dto.esDefault !== undefined) {
      await this.marcarUnicoDefaultCruzada(dto.esDefault, id);
      template.esDefault = dto.esDefault;
    }
    return this.cruzadaRepo.save(template);
  }

  async eliminarCruzada(id: string): Promise<void> {
    const template = await this.obtenerCruzada(id);
    await this.cruzadaRepo.remove(template);
  }

  private async marcarUnicoDefaultCruzada(esDefault: boolean | undefined, exceptoId?: string) {
    if (!esDefault) return;
    const actual = await this.cruzadaRepo.findOne({ where: { esDefault: true } });
    if (actual && actual.id !== exceptoId) {
      actual.esDefault = false;
      await this.cruzadaRepo.save(actual);
    }
  }
}
