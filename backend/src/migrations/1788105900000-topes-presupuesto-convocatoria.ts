import { MigrationInterface, QueryRunner } from 'typeorm';

export class TopesPresupuestoConvocatoria1788105900000 implements MigrationInterface {
  name = 'TopesPresupuestoConvocatoria1788105900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      ADD COLUMN "topePresupuestoNoConsolidado" numeric(14,2),
      ADD COLUMN "topePresupuestoConsolidado" numeric(14,2)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      DROP COLUMN "topePresupuestoNoConsolidado",
      DROP COLUMN "topePresupuestoConsolidado"
    `);
  }
}
