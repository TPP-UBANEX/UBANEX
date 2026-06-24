import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Proyecto } from '../proyectos/proyecto.entity';

@Entity()
export class Evaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  proyectoId: string;

  @ManyToOne(() => Proyecto)
  @JoinColumn({ name: 'proyectoId' })
  proyecto: Proyecto;

  @Column()
  evaluador: string;

  @Column()
  tipo: string;

  @Column({ default: 0 })
  puntaje: number;

  @Column({ nullable: true, type: 'text' })
  observaciones: string;

  @Column({ default: 'pendiente' })
  estado: string;
}
