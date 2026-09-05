import { MigrationInterface, QueryRunner } from 'typeorm';

export class RendicionesReescritura1788140000000 implements MigrationInterface {
  name = 'RendicionesReescritura1788140000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // La tabla previa casi sin uso se reescribe para asociar los comprobantes a
    // la edición (no al proyecto) y a un rubro del presupuesto de la edición.
    await queryRunner.query(`DROP TABLE IF EXISTS "rendicion"`);
    await queryRunner.query(`
      CREATE TABLE "rendicion" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "edicionId" uuid NOT NULL,
        "rubro" character varying NOT NULL,
        "monto" numeric(14,2) NOT NULL,
        "descripcion" text,
        "fecha" date NOT NULL,
        "comprobanteUrl" text,
        "estado" character varying NOT NULL DEFAULT 'EnRevision',
        "creadoPorId" uuid NOT NULL,
        "creadoEn" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rendicion" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "rendicion" ADD CONSTRAINT "FK_rendicion_edicion" FOREIGN KEY ("edicionId") REFERENCES "edicion"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "rendicion" ADD CONSTRAINT "FK_rendicion_creadoPor" FOREIGN KEY ("creadoPorId") REFERENCES "usuario"("id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rendicion"`);
  }
}
