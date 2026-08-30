import { MigrationInterface, QueryRunner } from 'typeorm';

export class AvalEdicion1788120000000 implements MigrationInterface {
  name = 'AvalEdicion1788120000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Link al aval (PDF firmado por el decano) que carga la Secretaría de la UA de la edición.
    await queryRunner.query(`
      ALTER TABLE "edicion"
      ADD COLUMN "avalUrl" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "edicion"
      DROP COLUMN "avalUrl"
    `);
  }
}
