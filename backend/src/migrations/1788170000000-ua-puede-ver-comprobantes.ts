import { MigrationInterface, QueryRunner } from 'typeorm';

export class UaPuedeVerComprobantes1788170000000 implements MigrationInterface {
  name = 'UaPuedeVerComprobantes1788170000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "edicion" ADD "uaPuedeVerComprobantes" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "edicion" DROP COLUMN "uaPuedeVerComprobantes"`);
  }
}