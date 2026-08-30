import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
import { EvaluacionInstitucional } from './evaluacion-institucional.entity';
import { EvaluacionCruzada } from './evaluacion-cruzada.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MailModule } from '../common/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EvaluacionInstitucional,
      EvaluacionCruzada,
      Convocatoria,
      Edicion,
      Emparejamiento,
      ParticipacionConvocatoria,
      Notificacion,
    ]),
    AuditoriaModule,
    MailModule,
  ],
  controllers: [EvaluacionesController],
  providers: [EvaluacionesService],
})
export class EvaluacionesModule {}
