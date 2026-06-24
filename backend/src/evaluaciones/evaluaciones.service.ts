import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluacion } from './evaluacion.entity';

@Injectable()
export class EvaluacionesService {
  constructor(
    @InjectRepository(Evaluacion)
    private readonly repo: Repository<Evaluacion>,
  ) {}

  findAll(proyectoId?: string) {
    const where = proyectoId ? { proyectoId } : {};
    return this.repo.find({ where, order: { puntaje: 'DESC' } });
  }
}
