import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Formulario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ default: false })
  esDefault: boolean;
}
