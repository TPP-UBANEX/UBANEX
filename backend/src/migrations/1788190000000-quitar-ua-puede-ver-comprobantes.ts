import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los comprobantes pasan a verlos siempre el Rectorado y quienes están relacionados al proyecto
 * (creador, dirección y Secretaría de una UA del proyecto), sin un toggle por edición. Se elimina
 * la columna `edicion.uaPuedeVerComprobantes` que agregó 1788170000000-ua-puede-ver-comprobantes.ts.
 */
export class QuitarUaPuedeVerComprobantes1788190000000 implements MigrationInterface {
  name = 'QuitarUaPuedeVerComprobantes1788190000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "edicion" DROP COLUMN IF EXISTS "uaPuedeVerComprobantes"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "edicion" ADD "uaPuedeVerComprobantes" boolean NOT NULL DEFAULT false`,
    );
  }
}
