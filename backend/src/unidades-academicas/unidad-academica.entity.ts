import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class UnidadAcademica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;

  /**
   * Dominio del correo institucional de la UA, sin la arroba (ej. `fi.uba.ar`). Los docentes y
   * estudiantes que se auto-registran en esta UA deben usar un email `algo@<dominioEmail>`.
   * Nullable: una UA sin dominio configurado no restringe el registro.
   */
  @Column({ type: 'varchar', nullable: true })
  dominioEmail: string | null;
}
