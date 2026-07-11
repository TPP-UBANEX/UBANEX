import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Convocatoria } from './convocatoria.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';

@Entity()
export class Emparejamiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  convocatoriaId: string;

  @ManyToOne(() => Convocatoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'convocatoriaId' })
  convocatoria: Convocatoria;

  @Column()
  unidadAId: string;

  @ManyToOne(() => UnidadAcademica)
  @JoinColumn({ name: 'unidadAId' })
  unidadA: UnidadAcademica;

  @Column()
  unidadBId: string;

  @ManyToOne(() => UnidadAcademica)
  @JoinColumn({ name: 'unidadBId' })
  unidadB: UnidadAcademica;
}
