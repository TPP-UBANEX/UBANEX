import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';

@Entity()
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  // Override manual del estado consolidado: null = automático (derivado del
  // historial de adjudicaciones), true/false = forzado por Rectorado.
  @Column({ type: 'boolean', nullable: true, default: null })
  esConsolidado: boolean | null;

  @Column({ default: false })
  esInterfacultad: boolean;

  @ManyToOne(() => UnidadAcademica, { nullable: true })
  @JoinColumn({ name: 'unidadAcademicaAdicionalId' })
  unidadAcademicaAdicional: UnidadAcademica | null;

  @Column({ nullable: true })
  unidadAcademicaAdicionalId: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column()
  creadoPorId: string;

  @CreateDateColumn()
  creadoEn: Date;
}
