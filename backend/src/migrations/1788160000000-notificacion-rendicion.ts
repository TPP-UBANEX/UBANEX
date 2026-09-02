import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificacionRendicion1788160000000 implements MigrationInterface {
  name = 'NotificacionRendicion1788160000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notificacion" ADD COLUMN "rendicionId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion"
       ADD CONSTRAINT "FK_notificacion_rendicion"
       FOREIGN KEY ("rendicionId") REFERENCES "rendicion"("id")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notificacion" DROP CONSTRAINT "FK_notificacion_rendicion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion" DROP COLUMN "rendicionId"`,
    );
  }
}
