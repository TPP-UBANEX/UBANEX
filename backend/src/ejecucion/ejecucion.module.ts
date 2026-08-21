import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hito } from './hito.entity';
import { AutoevaluacionImpacto } from './autoevaluacion-impacto.entity';
import { InformeFinal } from './informe-final.entity';
import { TemplateAutoevaluacionImpacto } from './template-autoevaluacion.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { EjecucionService } from './ejecucion.service';
import { HitosController } from './hitos.controller';
import { AutoevaluacionController } from './autoevaluacion.controller';
import { InformeFinalController } from './informe-final.controller';
import { TemplatesAutoevaluacionController } from './templates-autoevaluacion.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hito,
      AutoevaluacionImpacto,
      InformeFinal,
      TemplateAutoevaluacionImpacto,
      Edicion,
      Convocatoria,
      ParticipacionConvocatoria,
    ]),
    AuditoriaModule,
  ],
  controllers: [
    HitosController,
    AutoevaluacionController,
    InformeFinalController,
    TemplatesAutoevaluacionController,
  ],
  providers: [EjecucionService],
})
export class EjecucionModule {}