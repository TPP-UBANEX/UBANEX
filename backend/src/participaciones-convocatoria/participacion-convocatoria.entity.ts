import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Unique,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';

@Entity()
@Unique(['usuarioId', 'convocatoriaId'])
export class ParticipacionConvocatoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column()
  usuarioId: string;

  @ManyToOne(() => Convocatoria)
  @JoinColumn({ name: 'convocatoriaId' })
  convocatoria: Convocatoria;

  @Column()
  convocatoriaId: string;

  @Column({ type: 'varchar' })
  rol: RolEjecucion;

  @ManyToOne(() => Edicion, { nullable: true })
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion | null;

  @Column({ nullable: true })
  edicionId: string | null;

  @Column({ nullable: true })
  esDirectorPrincipal: boolean | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'asignadoPorId' })
  asignadoPor: Usuario;

  @Column()
  asignadoPorId: string;

  @CreateDateColumn()
  creadoEn: Date;
}
