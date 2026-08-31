import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResolucionAdjudicacion1788130000000 implements MigrationInterface {
  name = 'ResolucionAdjudicacion1788130000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Resolución de adjudicación: link a la resolución (no se suben archivos),
    // fecha, quién la emitió y el monto adjudicado por edición.
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      ADD COLUMN "adjudicacionEmitida" boolean NOT NULL DEFAULT false,
      ADD COLUMN "resolucionUrl" text,
      ADD COLUMN "fechaResolucion" date,
      ADD COLUMN "adjudicacionEmitidaPorId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      ADD CONSTRAINT "FK_convocatoria_adjudicacion_emitida_por"
      FOREIGN KEY ("adjudicacionEmitidaPorId") REFERENCES "usuario"("id")
    `);
    await queryRunner.query(`
      ALTER TABLE "edicion"
      ADD COLUMN "montoAdjudicado" numeric(14,2)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "edicion"
      DROP COLUMN "montoAdjudicado"
    `);
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      DROP CONSTRAINT "FK_convocatoria_adjudicacion_emitida_por"
    `);
    await queryRunner.query(`
      ALTER TABLE "convocatoria"
      DROP COLUMN "adjudicacionEmitida",
      DROP COLUMN "resolucionUrl",
      DROP COLUMN "fechaResolucion",
      DROP COLUMN "adjudicacionEmitidaPorId"
    `);
  }
}
