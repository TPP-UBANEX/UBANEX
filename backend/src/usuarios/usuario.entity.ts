import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoDirector } from '../common/enums/estado-director.enum';

@Entity()
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombreCompleto: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column('simple-array', { default: '' })
  roles: RolUsuario[];

  @ManyToOne(() => UnidadAcademica, { nullable: true })
  @JoinColumn({ name: 'unidadAcademicaId' })
  unidadAcademica: UnidadAcademica;

  @Column({ nullable: true })
  unidadAcademicaId: string;

  @Column({ nullable: true, type: 'varchar' })
  estadoDirector: EstadoDirector | null;

  @Column({ default: true })
  habilitado: boolean;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column({ nullable: true })
  creadoPorId: string;
}
