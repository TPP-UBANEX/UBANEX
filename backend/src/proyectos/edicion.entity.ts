import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { Presupuesto } from './presupuesto.interface';

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
  presupuesto: Presupuesto | null;

  @Column({ type: 'json', nullable: true })
  datosFormulario: object | null;

  @Column({ type: 'int', nullable: true })
  ordenMerito: number | null;

  @Column({ type: 'boolean', nullable: true })
  adjudicacionPropuesta: boolean | null;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v == null ? null : Number(v)),
    },
  })
  puntajeMerito: number | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @DeleteDateColumn()
  eliminadoEn: Date | null;
}
