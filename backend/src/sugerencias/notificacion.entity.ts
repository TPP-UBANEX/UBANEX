import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { SugerenciaCambio } from './sugerencia-cambio.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';

@Entity()
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column()
  usuarioId: string;

  @Column({ type: 'varchar' })
  tipo: TipoNotificacion;

  @ManyToOne(() => SugerenciaCambio, { nullable: true })
  @JoinColumn({ name: 'sugerenciaId' })
  sugerencia: SugerenciaCambio;

  @Column({ type: 'uuid', nullable: true })
  sugerenciaId: string | null;

  @ManyToOne(() => ParticipacionConvocatoria, { nullable: true })
  @JoinColumn({ name: 'participacionId' })
  participacion: ParticipacionConvocatoria;

  @Column({ type: 'uuid', nullable: true })
  participacionId: string | null;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn()
  creadoEn: Date;
}
