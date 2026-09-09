import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizacionAsociada1788210000000 implements MigrationInterface {
  name = 'OrganizacionAsociada1788210000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Organizaciones sociales participantes de una edición (dev las crea vía synchronize;
    // esta migración cubre el entorno de producción).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizacion_asociada" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "edicionId" uuid NOT NULL,
        "nombre" character varying NOT NULL,
        "tipo" character varying,
        "personeriaJuridica" character varying,
        "fechaInicioActividades" date,
        "responsableNombre" character varying,
        "responsableCargo" character varying,
        "direccion" character varying,
        "localidad" character varying,
        "codigoPostal" character varying,
        "departamentoPartido" character varying,
        "provincia" character varying,
        "telefonos" character varying,
        "email" character varying,
        "web" character varying,
        "objetivos" text,
        "actividades" text,
        "otraInfo" text,
        "creadoPorId" uuid NOT NULL,
        "creadoEn" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizadoEn" TIMESTAMP NOT NULL DEFAULT now(),
        "eliminadoEn" TIMESTAMP,
        CONSTRAINT "PK_organizacion_asociada" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "organizacion_asociada" ADD CONSTRAINT "FK_organizacion_edicion" FOREIGN KEY ("edicionId") REFERENCES "edicion"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "organizacion_asociada" ADD CONSTRAINT "FK_organizacion_creadoPor" FOREIGN KEY ("creadoPorId") REFERENCES "usuario"("id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organizacion_asociada"`);
  }
}
