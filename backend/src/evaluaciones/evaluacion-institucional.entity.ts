import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';

@Entity()
@Unique(['edicionId'])
export class EvaluacionInstitucional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Convocatoria)
  @JoinColumn({ name: 'convocatoriaId' })
  convocatoria: Convocatoria;

  @Column()
  convocatoriaId: string;

  @ManyToOne(() => Edicion)
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion;

  @Column()
  edicionId: string;

  @ManyToOne(() => TemplateEvaluacionInstitucional)
  @JoinColumn({ name: 'templateId' })
  template: TemplateEvaluacionInstitucional;

  @Column()
  templateId: string;

  @Column({ type: 'varchar', default: EstadoEvaluacion.Borrador })
  estado: EstadoEvaluacion;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'realizadoPorId' })
  realizadoPor: Usuario | null;

  @Column({ nullable: true })
  realizadoPorId: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'actualizadoPorId' })
  actualizadoPor: Usuario | null;

  @Column({ nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'confirmadoPorId' })
  confirmadoPor: Usuario | null;

  @Column({ nullable: true })
  confirmadoPorId: string | null;

  @Column({ type: 'json', nullable: true })
  categorias: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  checklist: Record<string, unknown> | null;

  @Column({ nullable: true, type: 'text' })
  observaciones: string | null;

  // Fijo y obligatorio para confirmar (ver evaluaciones.service.ts#faltantes), a diferencia de
  // `categorias`/`checklist` que son configurables por convocatoria vía el template. Vive fuera
  // del template a propósito: si fuera una subcategoría booleana, sumaría PUNTAJE_BOOLEANO al
  // puntaje de mérito además de mover el presupuesto a adjudicar (ver
  // proyectos/presupuesto.util.ts#calcularPresupuestoAAdjudicar), y el template puede editarse o
  // borrarse por convocatoria.
  @Column({ type: 'boolean', nullable: true })
  esPse: boolean | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
