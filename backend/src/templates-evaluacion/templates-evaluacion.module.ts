import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateEvaluacionInstitucional } from './template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from './template-evaluacion-cruzada.entity';
import { TemplatesEvaluacionInstitucionalController } from './templates-evaluacion-institucional.controller';
import { TemplatesEvaluacionCruzadaController } from './templates-evaluacion-cruzada.controller';
import { TemplatesEvaluacionService } from './templates-evaluacion.service';

@Module({
  imports: [TypeOrmModule.forFeature([TemplateEvaluacionInstitucional, TemplateEvaluacionCruzada])],
  controllers: [TemplatesEvaluacionInstitucionalController, TemplatesEvaluacionCruzadaController],
  providers: [TemplatesEvaluacionService],
  exports: [TemplatesEvaluacionService],
})
export class TemplatesEvaluacionModule {}
