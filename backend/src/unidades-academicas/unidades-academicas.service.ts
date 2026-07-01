import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidadAcademica } from './unidad-academica.entity';
import { CrearUnidadAcademicaDto } from './dto/crear-unidad-academica.dto';
import { ActualizarUnidadAcademicaDto } from './dto/actualizar-unidad-academica.dto';

@Injectable()
export class UnidadesAcademicasService {
  constructor(
    @InjectRepository(UnidadAcademica)
    private readonly repo: Repository<UnidadAcademica>,
  ) {}

  crear(dto: CrearUnidadAcademicaDto): Promise<UnidadAcademica> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  listar(): Promise<UnidadAcademica[]> {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async obtener(id: string): Promise<UnidadAcademica> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Unidad académica ${id} no encontrada`);
    return entity;
  }

  async actualizar(id: string, dto: ActualizarUnidadAcademicaDto): Promise<UnidadAcademica> {
    const entity = await this.obtener(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async eliminar(id: string): Promise<void> {
    const entity = await this.obtener(id);
    await this.repo.remove(entity);
  }
}
