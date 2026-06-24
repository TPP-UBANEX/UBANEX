import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Proyecto } from '../proyectos/proyecto.entity';

@Entity()
export class Rendicion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  proyectoId: string;

  @ManyToOne(() => Proyecto)
  @JoinColumn({ name: 'proyectoId' })
  proyecto: Proyecto;

  @Column()
  rubro: string;

  @Column()
  monto: number;

  @Column({ default: 'pendiente' })
  estado: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ nullable: true })
  comprobanteUrl: string;
}
