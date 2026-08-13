import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
import { TipoEvaluacionCruzada } from '../common/enums/tipo-evaluacion-cruzada.enum';

@Entity()
@Unique(['evaluadorId', 'edicionId'])
export class EvaluacionCruzada {
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

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'evaluadorId' })
  evaluador: Usuario;

  @Column()
  evaluadorId: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'actualizadoPorId' })
  actualizadoPor: Usuario | null;

  @Column({ nullable: true })
  actualizadoPorId: string | null;

  @Column({ type: 'varchar' })
  tipo: TipoEvaluacionCruzada;

  @ManyToOne(() => TemplateEvaluacionCruzada)
  @JoinColumn({ name: 'templateId' })
  template: TemplateEvaluacionCruzada;

  @Column()
  templateId: string;

  @Column({ type: 'varchar', default: EstadoEvaluacion.Borrador })
  estado: EstadoEvaluacion;

  @Column({ type: 'json', nullable: true })
  items: Record<string, unknown> | null;

  @Column({ nullable: true, type: 'text' })
  observaciones: string | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
