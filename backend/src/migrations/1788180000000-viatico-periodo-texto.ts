import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Las partidas de Viáticos y Seguros pasan de tener dos fechas (`periodoInicio`/`periodoFin`) a un
 * único campo de texto libre `periodo`. Se reescribe el JSON ya persistido en
 * `edicion.presupuestoSolicitado` y las rutas de sugerencias en `sugerencia_cambio.campo`.
 */
export class ViaticoPeriodoTexto1788180000000 implements MigrationInterface {
  name = 'ViaticoPeriodoTexto1788180000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const filas: { id: string; presupuestoSolicitado: unknown }[] = await queryRunner.query(
      `SELECT "id", "presupuestoSolicitado" FROM "edicion" WHERE "presupuestoSolicitado" IS NOT NULL`,
    );

    for (const fila of filas) {
      const presupuesto = fila.presupuestoSolicitado as {
        rubros?: { tipo?: string; partidas?: Record<string, unknown>[] }[];
      } | null;
      if (!presupuesto?.rubros) continue;

      let cambio = false;
      for (const rubro of presupuesto.rubros) {
        if (rubro.tipo !== 'ViaticosYSeguros' || !Array.isArray(rubro.partidas)) continue;
        for (const partida of rubro.partidas) {
          if (!('periodoInicio' in partida) && !('periodoFin' in partida) && 'periodo' in partida) {
            continue;
          }
          const inicio = typeof partida.periodoInicio === 'string' ? partida.periodoInicio : '';
          const fin = typeof partida.periodoFin === 'string' ? partida.periodoFin : '';
          partida.periodo = inicio && fin ? `${inicio} a ${fin}` : inicio || fin || '';
          delete partida.periodoInicio;
          delete partida.periodoFin;
          cambio = true;
        }
      }

      if (cambio) {
        await queryRunner.query(
          `UPDATE "edicion" SET "presupuestoSolicitado" = $1 WHERE "id" = $2`,
          [JSON.stringify(presupuesto), fila.id],
        );
      }
    }

    await queryRunner.query(`
      UPDATE "sugerencia_cambio"
      SET "campo" = regexp_replace("campo", '\\.periodo(Inicio|Fin)$', '.periodo')
      WHERE "campo" LIKE 'presupuestoSolicitado.%.periodoInicio'
         OR "campo" LIKE 'presupuestoSolicitado.%.periodoFin'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const filas: { id: string; presupuestoSolicitado: unknown }[] = await queryRunner.query(
      `SELECT "id", "presupuestoSolicitado" FROM "edicion" WHERE "presupuestoSolicitado" IS NOT NULL`,
    );

    for (const fila of filas) {
      const presupuesto = fila.presupuestoSolicitado as {
        rubros?: { tipo?: string; partidas?: Record<string, unknown>[] }[];
      } | null;
      if (!presupuesto?.rubros) continue;

      let cambio = false;
      for (const rubro of presupuesto.rubros) {
        if (rubro.tipo !== 'ViaticosYSeguros' || !Array.isArray(rubro.partidas)) continue;
        for (const partida of rubro.partidas) {
          if (!('periodo' in partida)) continue;
          partida.periodoInicio = typeof partida.periodo === 'string' ? partida.periodo : '';
          partida.periodoFin = '';
          delete partida.periodo;
          cambio = true;
        }
      }

      if (cambio) {
        await queryRunner.query(
          `UPDATE "edicion" SET "presupuestoSolicitado" = $1 WHERE "id" = $2`,
          [JSON.stringify(presupuesto), fila.id],
        );
      }
    }

    await queryRunner.query(`
      UPDATE "sugerencia_cambio"
      SET "campo" = "campo" || 'Inicio'
      WHERE "campo" LIKE 'presupuestoSolicitado.%.periodo'
    `);
  }
}
