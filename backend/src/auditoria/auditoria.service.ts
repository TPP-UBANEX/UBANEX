import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './auditoria.entity';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly repo: Repository<Auditoria>,
  ) {}

  async registrar(params: {
    usuarioId: string;
    accion: TipoAccionAuditoria;
    descripcion: string;
    responsableId: string;
    responsableNombre: string;
    motivo?: string;
  }): Promise<Auditoria> {
    const entity = this.repo.create(params);
    return this.repo.save(entity);
  }

  listarPorUsuario(usuarioId: string): Promise<Auditoria[]> {
    return this.repo.find({
      where: { usuarioId },
      order: { fecha: 'DESC' },
    });
  }
}
