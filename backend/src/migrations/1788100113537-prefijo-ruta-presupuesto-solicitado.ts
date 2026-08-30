import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrefijoRutaPresupuestoSolicitado1788100113537 implements MigrationInterface {
  name = 'PrefijoRutaPresupuestoSolicitado1788100113537';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Las sugerencias de cambio guardan la ubicación del campo sugerido como una ruta de texto en
    // sugerencia_cambio.campo (ej. "presupuesto.rubros[0].partidas[1].monto"). El prefijo quedó sin
    // renombrar cuando Edicion.presupuesto pasó a llamarse presupuestoSolicitado, porque no es un
    // campo de TypeScript sino datos ya persistidos. Se pone al día acá.
    await queryRunner.query(`
      UPDATE "sugerencia_cambio"
      SET "campo" = 'presupuestoSolicitado.' || substring("campo" from 13)
      WHERE "campo" LIKE 'presupuesto.%'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sugerencia_cambio"
      SET "campo" = 'presupuesto.' || substring("campo" from 23)
      WHERE "campo" LIKE 'presupuestoSolicitado.%'
    `);
  }
}
