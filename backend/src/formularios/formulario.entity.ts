import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { CampoFormulario } from './campo-formulario.interface';

@Entity()
export class Formulario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ default: false })
  esDefault: boolean;

  @Column({ default: false })
  esPlantilla: boolean;

  @Column({ type: 'json', nullable: true })
  campos: CampoFormulario[] | null;
}
