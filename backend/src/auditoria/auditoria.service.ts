import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './auditoria.entity';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { Usuario } from '../usuarios/usuario.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

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

  listarPorUsuario(usuarioId: string, usuarioLogueado: Usuario): Promise<Auditoria[]> {
    const esPropietario = usuarioLogueado.id === usuarioId;
    const esGestion = usuarioLogueado.roles.some(r =>
      [RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado,
       RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria].includes(r),
    );
    if (!esPropietario && !esGestion) {
      throw new ForbiddenException('No tenés permisos para ver la auditoría de este usuario');
    }
    return this.repo.find({
      where: { usuarioId },
      order: { fecha: 'DESC' },
    });
  }
}
