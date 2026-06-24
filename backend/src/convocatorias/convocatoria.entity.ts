import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Convocatoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ default: 'abierta' })
  estado: string;

  @Column({ type: 'date' })
  fechaApertura: string;

  @Column({ type: 'date' })
  fechaCierre: string;
}
