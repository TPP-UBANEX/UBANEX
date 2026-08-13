import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';

@Entity()
@Index(['entidad', 'entidadId'])
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  usuarioId: string;

  @Column({ type: 'varchar' })
  accion: TipoAccionAuditoria;

  @Column({ type: 'text' })
  descripcion: string;

  @Column()
  responsableId: string;

  @Column()
  responsableNombre: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ nullable: true, type: 'text' })
  motivo: string | null;

  @Column({ nullable: true, type: 'varchar' })
  entidad: string | null;

  @Column({ nullable: true, type: 'varchar' })
  entidadId: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'responsableId' })
  responsable: Usuario;
}
