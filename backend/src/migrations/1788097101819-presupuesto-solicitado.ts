import { MigrationInterface, QueryRunner } from 'typeorm';

export class PresupuestoSolicitado1788097101819 implements MigrationInterface {
  name = 'PresupuestoSolicitado1788097101819';

  async up(queryRunner: QueryRunner): Promise<void> {
    // El presupuesto de una edición es en realidad lo que el docente solicita, no lo que se le
    // adjudica: la adjudicación se calcula aparte a partir de este monto (ver
    // evaluaciones.service.ts#calcularPresupuestoAAdjudicar).
    await queryRunner.query(`
      ALTER TABLE "edicion"
      RENAME COLUMN "presupuesto" TO "presupuestoSolicitado"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "edicion"
      RENAME COLUMN "presupuestoSolicitado" TO "presupuesto"
    `);
  }
}
