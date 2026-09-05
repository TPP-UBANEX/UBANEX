import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { EstadoComprobante } from '../common/enums/estado-comprobante.enum';

@Entity()
export class Rendicion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  edicionId: string;

  @ManyToOne(() => Edicion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion;

  @Column({ type: 'varchar' })
  rubro: TipoRubro;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  monto: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text' })
  comprobanteUrl: string;

  @Column({ type: 'text', nullable: true })
  motivoRechazo: string | null;

  @Column({ type: 'varchar', default: EstadoComprobante.EnRevision })
  estado: EstadoComprobante;

  @Column()
  creadoPorId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @CreateDateColumn()
  creadoEn: Date;
}
