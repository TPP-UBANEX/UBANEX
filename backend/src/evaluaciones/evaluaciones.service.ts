import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluacionInstitucional } from './evaluacion-institucional.entity';
import { EvaluacionCruzada } from './evaluacion-cruzada.entity';

@Injectable()
export class EvaluacionesService {
  constructor(
    @InjectRepository(EvaluacionInstitucional)
    private readonly institucionalRepo: Repository<EvaluacionInstitucional>,
    @InjectRepository(EvaluacionCruzada)
    private readonly cruzadaRepo: Repository<EvaluacionCruzada>,
  ) {}

  findAll(_proyectoId?: string): Promise<[]> {
    return Promise.resolve([]);
  }
}
