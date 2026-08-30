import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtrasPresupuestoAdjudicar1788110000000 implements MigrationInterface {
  name = 'ExtrasPresupuestoAdjudicar1788110000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      ADD COLUMN "porcentajeExtraInsumos" numeric(5,2) NOT NULL DEFAULT 35,
      ADD COLUMN "umbralInsumos" numeric(5,2) NOT NULL DEFAULT 40,
      ADD COLUMN "porcentajeExtraPse" numeric(5,2) NOT NULL DEFAULT 15
    `);
    await queryRunner.query(`
      ALTER TABLE "evaluacion_institucional"
      ADD COLUMN "esPse" boolean
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "evaluacion_institucional"
      DROP COLUMN "esPse"
    `);
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      DROP COLUMN "porcentajeExtraInsumos",
      DROP COLUMN "umbralInsumos",
      DROP COLUMN "porcentajeExtraPse"
    `);
  }
}
