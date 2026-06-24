import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Convocatoria } from '../convocatorias/convocatoria.entity';

@Entity()
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  convocatoriaId: string;

  @ManyToOne(() => Convocatoria)
  @JoinColumn({ name: 'convocatoriaId' })
  convocatoria: Convocatoria;

  @Column()
  titulo: string;

  @Column()
  director: string;

  @Column()
  facultad: string;

  @Column({ nullable: true, type: 'text' })
  resumen: string;

  @Column({ default: 'presentado' })
  estado: string;

  @Column({ nullable: true })
  puntaje: number;

  @Column({ nullable: true })
  montoAsignado: number;
}
