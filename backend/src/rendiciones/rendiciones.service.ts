import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rendicion } from './rendicion.entity';

@Injectable()
export class RendicionesService {
  constructor(
    @InjectRepository(Rendicion)
    private readonly repo: Repository<Rendicion>,
  ) {}

  findAll(proyectoId?: string) {
    const where = proyectoId ? { proyectoId } : {};
    return this.repo.find({ where, order: { fecha: 'DESC' } });
  }
}
