import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { EstructuraTemplateCruzada } from '../templates-evaluacion/estructura-template';

@Entity()
export class TemplateEvaluacionCruzada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ default: false })
  esDefault: boolean;

  @Column({ default: false })
  esPlantilla: boolean;

  @Column({ type: 'json', nullable: true })
  estructura: EstructuraTemplateCruzada | null;
}
