import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';

@Entity()
export class Edicion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Proyecto)
  @JoinColumn({ name: 'proyectoId' })
  proyecto: Proyecto;

  @Column()
  proyectoId: string;

  @ManyToOne(() => Convocatoria)
  @JoinColumn({ name: 'convocatoriaId' })
  convocatoria: Convocatoria;

  @Column()
  convocatoriaId: string;

  @Column({ type: 'varchar', default: EstadoEdicion.Borrador })
  estado: EstadoEdicion;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column()
  creadoPorId: string;

  @ManyToOne(() => UnidadAcademica)
  @JoinColumn({ name: 'unidadAcademicaId' })
  unidadAcademica: UnidadAcademica;

  @Column()
  unidadAcademicaId: string;

  @Column({ nullable: true, type: 'int' })
  anioEdicion: number | null;

  @Column({ type: 'json', nullable: true })
  presupuesto: object | null;

  @Column({ type: 'json', nullable: true })
  datosFormulario: object | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @DeleteDateColumn()
  eliminadoEn: Date | null;
}
