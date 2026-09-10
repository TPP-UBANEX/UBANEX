import { MigrationInterface, QueryRunner } from 'typeorm';

export class UaDominioEmail1788200000000 implements MigrationInterface {
  name = 'UaDominioEmail1788200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Dominio del correo institucional de cada unidad académica (sin arroba, ej. fi.uba.ar).
    await queryRunner.query(`
      ALTER TABLE "unidad_academica"
      ADD COLUMN "dominioEmail" character varying
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "unidad_academica"
      DROP COLUMN "dominioEmail"
    `);
  }
}
