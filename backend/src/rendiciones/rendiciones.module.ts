import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RendicionesController } from './rendiciones.controller';
import { RendicionesService } from './rendiciones.service';
import { Rendicion } from './rendicion.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rendicion, Edicion, Convocatoria, ParticipacionConvocatoria, Notificacion, Usuario]),
    AuditoriaModule,
  ],
  controllers: [RendicionesController],
  providers: [RendicionesService],
})
export class RendicionesModule {}
