import { MigrationInterface, QueryRunner } from 'typeorm';

export class HitoLinks1788140000000 implements MigrationInterface {
  name = 'HitoLinks1788140000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Links (absolutos) que el director agrega a un hito para mostrar avances.
    await queryRunner.query(`
      ALTER TABLE "hito"
      ADD COLUMN "links" json
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hito"
      DROP COLUMN "links"
    `);
  }
}
