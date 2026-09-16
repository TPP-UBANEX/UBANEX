import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsuarioDatosDocente1788170000000 implements MigrationInterface {
  name = 'UsuarioDatosDocente1788170000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Datos obligatorios del perfil docente: CUIL y links (Google Drive) a la
    // documentación respaldatoria. Columnas nullable para no romper usuarios ya cargados.
    await queryRunner.query(`
      ALTER TABLE "usuario"
      ADD COLUMN "cuil" varchar,
      ADD COLUMN "resumenCv" text,
      ADD COLUMN "linkFotocopiaDni" text,
      ADD COLUMN "linkConstanciaCuil" text,
      ADD COLUMN "linkConstanciaCargo" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuario"
      DROP COLUMN "cuil",
      DROP COLUMN "resumenCv",
      DROP COLUMN "linkFotocopiaDni",
      DROP COLUMN "linkConstanciaCuil",
      DROP COLUMN "linkConstanciaCargo"
    `);
  }
}
