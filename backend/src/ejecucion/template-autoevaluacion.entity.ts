import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { EstructuraTemplateAutoevaluacion } from './estructura-autoevaluacion';

@Entity()
export class TemplateAutoevaluacionImpacto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ default: false })
  esDefault: boolean;

  @Column({ default: false })
  esPlantilla: boolean;

  @Column({ type: 'json', nullable: true })
  estructura: EstructuraTemplateAutoevaluacion | null;
}