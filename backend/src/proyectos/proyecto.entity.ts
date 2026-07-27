import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity()
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ default: false })
  esConsolidado: boolean;

  @Column({ default: false })
  esInterfacultad: boolean;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column()
  creadoPorId: string;

  @CreateDateColumn()
  creadoEn: Date;
}
