import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { UnidadesAcademicasModule } from '../unidades-academicas/unidades-academicas.module';
import { CarrerasModule } from '../carreras/carreras.module';
import { SeedService } from './seed.service';
import { Usuario } from '../usuarios/usuario.entity';
import { Formulario } from '../formularios/formulario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import { EvaluacionInstitucional } from '../evaluaciones/evaluacion-institucional.entity';
import { EvaluacionCruzada } from '../evaluaciones/evaluacion-cruzada.entity';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { Hito } from '../ejecucion/hito.entity';
import { AutoevaluacionImpacto } from '../ejecucion/autoevaluacion-impacto.entity';
import { InformeFinal } from '../ejecucion/informe-final.entity';
import { TemplateAutoevaluacionImpacto } from '../ejecucion/template-autoevaluacion.entity';
import { Rendicion } from '../rendiciones/rendicion.entity';

@Module({
  imports: [
    UsuariosModule,
    UnidadesAcademicasModule,
    CarrerasModule,
    TypeOrmModule.forFeature([
      Usuario,
      Formulario,
      Convocatoria,
      Proyecto,
      Edicion,
      ParticipacionConvocatoria,
      Emparejamiento,
      TemplateEvaluacionInstitucional,
      TemplateEvaluacionCruzada,
      EvaluacionInstitucional,
      EvaluacionCruzada,
      Notificacion,
      Hito,
      AutoevaluacionImpacto,
      InformeFinal,
      TemplateAutoevaluacionImpacto,
      Rendicion,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
