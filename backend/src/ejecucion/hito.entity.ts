import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { CategoriaHito } from '../common/enums/categoria-hito.enum';

@Entity()
export class Hito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Edicion)
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion;

  @Column()
  edicionId: string;

  @Column()
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'date', nullable: true })
  fechaInicio: string | null;

  @Column({ type: 'date', nullable: true })
  fechaFin: string | null;

  @Column({ nullable: true })
  integrantes: string | null;

  @Column({ type: 'varchar' })
  categoria: CategoriaHito;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column()
  creadoPorId: string;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @DeleteDateColumn()
  eliminadoEn: Date | null;
}