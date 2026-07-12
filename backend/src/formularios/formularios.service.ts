import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formulario } from './formulario.entity';

@Injectable()
export class FormulariosService {
  constructor(
    @InjectRepository(Formulario)
    private readonly repo: Repository<Formulario>,
  ) {}

  listar() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  obtener(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async crear(dto: { nombre: string; esDefault?: boolean }) {
    if (dto.esDefault) {
      const actual = await this.repo.findOne({ where: { esDefault: true } });
      if (actual) {
        actual.esDefault = false;
        await this.repo.save(actual);
      }
    }
    const formulario = this.repo.create(dto);
    return this.repo.save(formulario);
  }
}
