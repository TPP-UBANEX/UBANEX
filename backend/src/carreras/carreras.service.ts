import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carrera } from './carrera.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { CrearCarreraDto } from './dto/crear-carrera.dto';

@Injectable()
export class CarrerasService {
  constructor(
    @InjectRepository(Carrera)
    private readonly repo: Repository<Carrera>,
    @InjectRepository(UnidadAcademica)
    private readonly uaRepo: Repository<UnidadAcademica>,
  ) {}

  async crear(dto: CrearCarreraDto): Promise<Carrera> {
    const ua = await this.uaRepo.findOne({ where: { id: dto.unidadAcademicaId } });
    if (!ua) {
      throw new BadRequestException(`Unidad académica ${dto.unidadAcademicaId} no encontrada`);
    }
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  listar(): Promise<Carrera[]> {
    return this.repo.find({
      relations: { unidadAcademica: true },
      order: { nombre: 'ASC' },
    });
  }

  listarPorUnidadAcademica(unidadAcademicaId: string): Promise<Carrera[]> {
    return this.repo.find({
      where: { unidadAcademicaId },
      relations: { unidadAcademica: true },
      order: { nombre: 'ASC' },
    });
  }

  async obtener(id: string): Promise<Carrera> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: { unidadAcademica: true },
    });
    if (!entity) throw new NotFoundException(`Carrera ${id} no encontrada`);
    return entity;
  }
}
