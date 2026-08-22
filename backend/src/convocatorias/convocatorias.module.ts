import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConvocatoriasController } from './convocatorias.controller';
import { ConvocatoriasService } from './convocatorias.service';
import { Convocatoria } from './convocatoria.entity';
import { Emparejamiento } from './emparejamiento.entity';
import { Formulario } from '../formularios/formulario.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import { TemplateAutoevaluacionImpacto } from '../ejecucion/template-autoevaluacion.entity';
import { Edicion } from '../proyectos/edicion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Convocatoria,
      Emparejamiento,
      Formulario,
      UnidadAcademica,
      TemplateEvaluacionInstitucional,
      TemplateEvaluacionCruzada,
      TemplateAutoevaluacionImpacto,
      Edicion,
    ]),
  ],
  controllers: [ConvocatoriasController],
  providers: [ConvocatoriasService],
  exports: [ConvocatoriasService],
})
export class ConvocatoriasModule {}
