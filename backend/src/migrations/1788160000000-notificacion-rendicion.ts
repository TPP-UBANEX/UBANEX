import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificacionRendicion1788160000000 implements MigrationInterface {
  name = 'NotificacionRendicion1788160000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // En desarrollo (synchronize: true) TypeORM puede haber creado una FK automática
    // sobre "rendicionId" con ON DELETE NO ACTION, que bloquea el borrado de un
    // comprobante asociado. Se droppean todas las FKs existentes sobre esa columna y
    // se recrea una única con ON DELETE SET NULL.
    const fks: { conname: string }[] = await queryRunner.query(
      `SELECT c.conname
         FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
         JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'notificacion'
          AND a.attname = 'rendicionId'
          AND c.contype = 'f'`,
    );
    for (const fk of fks) {
      await queryRunner.query(`ALTER TABLE "notificacion" DROP CONSTRAINT "${fk.conname}"`);
    }

    const cols: { column_name: string }[] = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'notificacion' AND column_name = 'rendicionId'`,
    );
    if (cols.length === 0) {
      await queryRunner.query(`ALTER TABLE "notificacion" ADD COLUMN "rendicionId" uuid`);
    }

    await queryRunner.query(
      `ALTER TABLE "notificacion"
       ADD CONSTRAINT "FK_notificacion_rendicion"
       FOREIGN KEY ("rendicionId") REFERENCES "rendicion"("id")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notificacion" DROP CONSTRAINT IF EXISTS "FK_notificacion_rendicion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion" DROP COLUMN IF EXISTS "rendicionId"`,
    );
  }
}
