import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizacionAsociada } from './organizacion-asociada.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { OrganizacionesAsociadasService } from './organizaciones-asociadas.service';
import { OrganizacionesAsociadasController } from './organizaciones-asociadas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizacionAsociada, Edicion, ParticipacionConvocatoria]),
    AuditoriaModule,
  ],
  controllers: [OrganizacionesAsociadasController],
  providers: [OrganizacionesAsociadasService],
})
export class OrganizacionesAsociadasModule {}
