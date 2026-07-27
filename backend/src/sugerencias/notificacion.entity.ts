import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { SugerenciaCambio } from './sugerencia-cambio.entity';
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

  @ManyToOne(() => SugerenciaCambio)
  @JoinColumn({ name: 'sugerenciaId' })
  sugerencia: SugerenciaCambio;

  @Column()
  sugerenciaId: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn()
  creadoEn: Date;
}
