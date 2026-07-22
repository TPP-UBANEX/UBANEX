import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';

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
  estadoValidacionDocente: EstadoValidacionDocente | null;

  @Column({ default: true })
  habilitado: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  ultimaActividad: Date | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column({ nullable: true })
  creadoPorId: string;
}
