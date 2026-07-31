import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';

@Entity()
export class Carrera {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @ManyToOne(() => UnidadAcademica, { nullable: false })
  @JoinColumn({ name: 'unidadAcademicaId' })
  unidadAcademica: UnidadAcademica;

  @Column()
  unidadAcademicaId: string;
}
