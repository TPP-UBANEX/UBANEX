import { MigrationInterface, QueryRunner } from 'typeorm';

export class RendicionLinkObligatorioMotivo1788150000000 implements MigrationInterface {
  name = 'RendicionLinkObligatorioMotivo1788150000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // El link al comprobante es siempre obligatorio; se normaliza cualquier fila
    // hipotética sin link antes de imponer la restricción NOT NULL.
    await queryRunner.query(`UPDATE "rendicion" SET "comprobanteUrl" = '' WHERE "comprobanteUrl" IS NULL`);
    await queryRunner.query(`ALTER TABLE "rendicion" ALTER COLUMN "comprobanteUrl" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "rendicion" ADD COLUMN "motivoRechazo" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rendicion" ALTER COLUMN "comprobanteUrl" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "rendicion" DROP COLUMN "motivoRechazo"`);
  }
}
