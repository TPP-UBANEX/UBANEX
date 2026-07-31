import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { Carrera } from '../carreras/carrera.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { Genero } from '../common/enums/genero.enum';
import { CargoDocente } from '../common/enums/cargo-docente.enum';
import { TipoDesignacionDocente } from '../common/enums/tipo-designacion-docente.enum';

@Entity()
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombreCompleto: string;

  @Column({ nullable: true })
  nombre: string | null;

  @Column({ nullable: true })
  apellido: string | null;

  @Column({ nullable: true })
  telefono: string | null;

  @Column({ nullable: true, type: 'varchar' })
  genero: Genero | null;

  @Column({ nullable: true, type: 'boolean' })
  personaConDiscapacidad: boolean | null;

  @Column({ nullable: true, type: 'varchar' })
  cargoDocente: CargoDocente | null;

  @Column({ nullable: true, type: 'varchar' })
  tipoDesignacionDocente: TipoDesignacionDocente | null;

  @Column({ nullable: true })
  areaDocente: string | null;

  @Column({ nullable: true })
  direccionLocalidad: string | null;

  @Column({ nullable: true, type: 'smallint' })
  porcentajeCarrera: number | null;

  @ManyToOne(() => Carrera, { nullable: true })
  @JoinColumn({ name: 'carreraId' })
  carrera: Carrera | null;

  @Column({ nullable: true })
  carreraId: string | null;

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
