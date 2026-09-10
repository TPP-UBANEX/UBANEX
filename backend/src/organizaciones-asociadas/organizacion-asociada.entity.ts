import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { Edicion } from '../proyectos/edicion.entity';
import { Usuario } from '../usuarios/usuario.entity';

/**
 * Organización social participante de un proyecto (escuela, asociación civil, fundación,
 * cooperativa, etc.). Un proyecto (edición) puede tener varias. Estructura basada en la
 * "Información institucional de organizaciones sociales participantes" del formulario oficial.
 */
@Entity()
export class OrganizacionAsociada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Edicion)
  @JoinColumn({ name: 'edicionId' })
  edicion: Edicion;

  @Column()
  edicionId: string;

  @Column()
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  tipo: string | null;

  @Column({ type: 'varchar', nullable: true })
  personeriaJuridica: string | null;

  @Column({ type: 'date', nullable: true })
  fechaInicioActividades: string | null;

  @Column({ type: 'varchar', nullable: true })
  responsableNombre: string | null;

  @Column({ type: 'varchar', nullable: true })
  responsableCargo: string | null;

  @Column({ type: 'varchar', nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', nullable: true })
  localidad: string | null;

  @Column({ type: 'varchar', nullable: true })
  codigoPostal: string | null;

  @Column({ type: 'varchar', nullable: true })
  departamentoPartido: string | null;

  @Column({ type: 'varchar', nullable: true })
  provincia: string | null;

  @Column({ type: 'varchar', nullable: true })
  telefonos: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  web: string | null;

  @Column({ type: 'text', nullable: true })
  objetivos: string | null;

  @Column({ type: 'text', nullable: true })
  actividades: string | null;

  @Column({ type: 'text', nullable: true })
  otraInfo: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column()
  creadoPorId: string;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @DeleteDateColumn()
  eliminadoEn: Date | null;
}
