import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class UnidadAcademica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;
}
