import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoInforme } from '../common/enums/estado-informe.enum';

@Entity()
export class InformeFinal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Edicion)
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion;

  @Column()
  edicionId: string;

  @ManyToOne(() => Convocatoria)
  @JoinColumn({ name: 'convocatoriaId' })
  convocatoria: Convocatoria;

  @Column()
  convocatoriaId: string;

  @Column({ type: 'varchar', default: EstadoInforme.Borrador })
  estado: EstadoInforme;

  @Column({ type: 'text', nullable: true })
  contenido: string | null;

  @Column({ nullable: true })
  archivoAdjuntoUrl: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'actualizadoPorId' })
  actualizadoPor: Usuario | null;

  @Column({ nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'confirmadoPorId' })
  confirmadoPor: Usuario | null;

  @Column({ nullable: true })
  confirmadoPorId: string | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmadoEn: Date | null;
}