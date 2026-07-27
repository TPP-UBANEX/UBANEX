import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoSugerencia } from '../common/enums/estado-sugerencia.enum';

@Entity()
export class SugerenciaCambio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Edicion)
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion;

  @Column()
  edicionId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'sugeridoPorId' })
  sugeridoPor: Usuario;

  @Column()
  sugeridoPorId: string;

  @Column()
  campo: string;

  @Column({ type: 'text', nullable: true })
  valorActual: string | null;

  @Column({ type: 'text', nullable: true })
  valorSugerido: string | null;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ type: 'varchar', default: EstadoSugerencia.Pendiente })
  estado: EstadoSugerencia;

  @Column({ type: 'text', nullable: true })
  respuestaDirector: string | null;

  @CreateDateColumn()
  creadoEn: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondidoEn: Date | null;
}
