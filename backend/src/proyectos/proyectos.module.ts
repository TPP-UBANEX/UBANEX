import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './proyecto.entity';
import { Edicion } from './edicion.entity';
import { Formulario } from '../formularios/formulario.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { EvaluacionInstitucional } from '../evaluaciones/evaluacion-institucional.entity';
import { EvaluacionCruzada } from '../evaluaciones/evaluacion-cruzada.entity';
import { SugerenciaCambio } from '../sugerencias/sugerencia-cambio.entity';
import { ParticipacionesConvocatoriaModule } from '../participaciones-convocatoria/participaciones-convocatoria.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proyecto,
      Edicion,
      Formulario,
      Emparejamiento,
      EvaluacionInstitucional,
      EvaluacionCruzada,
      SugerenciaCambio,
    ]),
    ParticipacionesConvocatoriaModule,
    AuditoriaModule,
  ],
  controllers: [ProyectosController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}
