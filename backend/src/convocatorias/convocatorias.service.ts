import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Convocatoria } from './convocatoria.entity';

@Injectable()
export class ConvocatoriasService {
  constructor(
    @InjectRepository(Convocatoria)
    private readonly repo: Repository<Convocatoria>,
  ) {}

  findAll() {
    return this.repo.find();
  }
}
