import { Entity, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { Formulario } from '../formularios/formulario.entity';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import { TemplateAutoevaluacionImpacto } from '../ejecucion/template-autoevaluacion.entity';
import { Usuario } from '../usuarios/usuario.entity';

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

  @Column({ type: 'int', nullable: true, default: 0 })
  cuotaFederativa: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  presupuestoTotal: number | null;

  // Tope por proyecto sobre el total del presupuesto solicitado (no el que se adjudica), según si
  // el proyecto es consolidado o no (ver proyectos/consolidacion.ts). null o <= 0 = sin tope.
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  topePresupuestoNoConsolidado: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  topePresupuestoConsolidado: number | null;

  // Porcentajes (no fracciones) que componen el presupuesto a adjudicar por sobre el solicitado
  // (ver proyectos/presupuesto.util.ts#calcularPresupuestoAAdjudicar). 0 = extra desactivado.
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 35 })
  porcentajeExtraInsumos: number;

  // % mínimo del total solicitado que debe corresponder a partidas de bienes marcadas como
  // insumo para que aplique el extra por insumos.
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 40 })
  umbralInsumos: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 15 })
  porcentajeExtraPse: number;

  @Column({ type: 'boolean', default: false })
  ordenMeritoConfirmado: boolean;

  // Resolución de adjudicación: paso posterior a confirmar el orden de mérito.
  // Rectorado carga el link a la resolución (no se suben archivos) y la fecha, y
  // al emitir las ediciones pasan a Adjudicado / NoAdjudicado. Inmutable una vez
  // emitida.
  @Column({ type: 'boolean', default: false })
  adjudicacionEmitida: boolean;

  @Column({ type: 'text', nullable: true })
  resolucionUrl: string | null;

  @Column({ type: 'date', nullable: true })
  fechaResolucion: string | null;

  @Column({ type: 'uuid', nullable: true })
  adjudicacionEmitidaPorId: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'adjudicacionEmitidaPorId' })
  adjudicacionEmitidaPor: Usuario | null;

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
