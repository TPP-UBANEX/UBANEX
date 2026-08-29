import { MigrationInterface, QueryRunner } from 'typeorm';

export class CuotaFederativa1788041652646 implements MigrationInterface {
  name = 'CuotaFederativa1788041652646';

  async up(queryRunner: QueryRunner): Promise<void> {
    // El mecanismo de adjudicación "CUPO" es en realidad la "cuota federativa"
    // que la convocatoria le garantiza a cada unidad académica.
    await queryRunner.query(`
      UPDATE "edicion" SET "mecanismoAdjudicacion" = 'CUOTA_FEDERATIVA'
      WHERE "mecanismoAdjudicacion" = 'CUPO'
    `);

    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      RENAME COLUMN "cupoMinimoPorUnidadAcademica" TO "cuotaFederativa"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      RENAME COLUMN "cuotaFederativa" TO "cupoMinimoPorUnidadAcademica"
    `);

    await queryRunner.query(`
      UPDATE "edicion" SET "mecanismoAdjudicacion" = 'CUPO'
      WHERE "mecanismoAdjudicacion" = 'CUOTA_FEDERATIVA'
    `);
  }
}
