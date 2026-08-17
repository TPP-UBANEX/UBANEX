import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoAutoevaluacion } from '../common/enums/estado-autoevaluacion.enum';

@Entity()
export class AutoevaluacionImpacto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Edicion)
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion;

  @Column()
  edicionId: string;

  @ManyToOne(() => Convocatoria)
  @JoinColumn({ name: 'convocatoriaId' })
  convocatoria: Convocatoria;

  @Column()
  convocatoriaId: string;

  @Column({ nullable: true })
  templateId: string;

  @Column({ type: 'varchar', default: EstadoAutoevaluacion.Borrador })
  estado: EstadoAutoevaluacion;

  @Column({ type: 'json', nullable: true })
  respuestas: Record<string, unknown> | null;

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

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}