import { Entity, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { Formulario } from '../formularios/formulario.entity';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import { TemplateAutoevaluacionImpacto } from '../ejecucion/template-autoevaluacion.entity';

@Entity()
export class Convocatoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ type: 'int', nullable: true, default: 2026 })
  anio: number;

  @Column({ type: 'enum', enum: EstadoConvocatoria, default: EstadoConvocatoria.Configuracion })
  estado: EstadoConvocatoria;

  @Column({ type: 'date', nullable: true })
  fechaInicioPresentacion: string | null;

  @Column({ type: 'date', nullable: true })
  fechaFinPresentacion: string | null;

  @Column({ type: 'date', nullable: true })
  fechaInicioEvaluacion: string | null;

  @Column({ type: 'date', nullable: true })
  fechaFinEvaluacion: string | null;

  @Column({ type: 'date', nullable: true })
  fechaInicioEjecucion: string | null;

  @Column({ type: 'date', nullable: true })
  fechaFinEjecucion: string | null;

  @OneToOne(() => Formulario, { nullable: true })
  @JoinColumn({ name: 'formularioId' })
  formulario: Formulario | null;

  @Column({ nullable: true })
  formularioId: string | null;

  @ManyToOne(() => TemplateEvaluacionInstitucional, { nullable: true })
  @JoinColumn({ name: 'templateEvaluacionInstitucionalId' })
  templateEvaluacionInstitucional: TemplateEvaluacionInstitucional | null;

  @Column({ nullable: true })
  templateEvaluacionInstitucionalId: string | null;

  @ManyToOne(() => TemplateEvaluacionCruzada, { nullable: true })
  @JoinColumn({ name: 'templateEvaluacionCruzadaId' })
  templateEvaluacionCruzada: TemplateEvaluacionCruzada | null;

  @Column({ nullable: true })
  templateEvaluacionCruzadaId: string | null;

  @ManyToOne(() => TemplateAutoevaluacionImpacto, { nullable: true })
  @JoinColumn({ name: 'templateAutoevaluacionImpactoId' })
  templateAutoevaluacionImpacto: TemplateAutoevaluacionImpacto | null;

  @Column({ nullable: true })
  templateAutoevaluacionImpactoId: string | null;

  // Diferencia de puntaje (en puntos de la evaluación cruzada) a partir de la
  // cual la edición se marca como inconsistente y puede requerir la tercera
  // Unidad Académica de desempate. Null → usa el default del sistema.
  @Column({ type: 'int', nullable: true })
  umbralInconsistenciaCruzada: number | null;
}
