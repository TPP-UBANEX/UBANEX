import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { Formulario } from '../formularios/formulario.entity';

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
}
