import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { REQUIERE_PARTICIPACION_KEY } from '../decorators/requiere-participacion.decorator';
import { ParticipacionConvocatoria } from '../../participaciones-convocatoria/participacion-convocatoria.entity';
import { RolEjecucion } from '../../common/enums/rol-ejecucion.enum';

@Injectable()
export class ParticipacionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly repo: Repository<ParticipacionConvocatoria>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RolEjecucion[]>(
      REQUIERE_PARTICIPACION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const convocatoriaId = request.params?.convocatoriaId
      || request.query?.convocatoriaId
      || request.body?.convocatoriaId;

    if (!convocatoriaId) return false;

    const participacion = await this.repo.findOne({
      where: {
        usuarioId: user.id,
        convocatoriaId,
        rol: In(requiredRoles),
      },
    });

    return !!participacion;
  }
}
