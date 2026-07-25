import { MigrationInterface, QueryRunner } from 'typeorm';

export class RolesPorConvocatoria1742677200000 implements MigrationInterface {
  name = 'RolesPorConvocatoria1742677200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Renombrar columna estadoDirector -> estadoValidacionDocente
    await queryRunner.query(`
      ALTER TABLE "usuario"
      RENAME COLUMN "estadoDirector" TO "estadoValidacionDocente"
    `);

    // 2. Crear tabla participacion_convocatoria
    await queryRunner.query(`
      CREATE TABLE "participacion_convocatoria" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuarioId" uuid NOT NULL,
        "convocatoriaId" uuid NOT NULL,
        "rol" character varying NOT NULL,
        "edicionId" uuid,
        "esDirectorPrincipal" boolean,
        "asignadoPorId" uuid NOT NULL,
        "creadoEn" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_participacion_convocatoria" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_participacion_usuario_convocatoria" UNIQUE ("usuarioId", "convocatoriaId")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "participacion_convocatoria"
      ADD CONSTRAINT "FK_participacion_usuario"
      FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "participacion_convocatoria"
      ADD CONSTRAINT "FK_participacion_convocatoria"
      FOREIGN KEY ("convocatoriaId") REFERENCES "convocatoria"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "participacion_convocatoria"
      ADD CONSTRAINT "FK_participacion_edicion"
      FOREIGN KEY ("edicionId") REFERENCES "edicion"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "participacion_convocatoria"
      ADD CONSTRAINT "FK_participacion_asignado_por"
      FOREIGN KEY ("asignadoPorId") REFERENCES "usuario"("id")
    `);

    // 3. Agregar creadoPorId a edicion
    await queryRunner.query(`
      ALTER TABLE "edicion"
      ADD COLUMN "creadoPorId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "edicion"
      ADD CONSTRAINT "FK_edicion_creado_por"
      FOREIGN KEY ("creadoPorId") REFERENCES "usuario"("id")
    `);

    // 4. Migrar datos: establecer creadoPorId desde directorId (mejor estimación disponible)
    //    y crear ParticipacionConvocatoria para directores existentes
    await queryRunner.query(`
      UPDATE "edicion" SET "creadoPorId" = "directorId"
      WHERE "creadoPorId" IS NULL
    `);

    // Crear usuario sistema para asignaciones históricas
    await queryRunner.query(`
      INSERT INTO "usuario" ("id", "nombreCompleto", "email", "password", "roles", "habilitado")
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        'Sistema',
        'sistema@ubanex.uba.ar',
        '',
        '{Docente}',
        false
      )
      ON CONFLICT ("email") DO NOTHING
    `);

    // Crear ParticipacionConvocatoria para directores existentes
    await queryRunner.query(`
      INSERT INTO "participacion_convocatoria" ("usuarioId", "convocatoriaId", "rol", "edicionId", "esDirectorPrincipal", "asignadoPorId")
      SELECT
        e."directorId",
        e."convocatoriaId",
        'DirectorDeProyecto',
        e."id",
        true,
        '00000000-0000-0000-0000-000000000000'
      FROM "edicion" e
      WHERE e."directorId" IS NOT NULL
    `);

    // Crear ParticipacionConvocatoria para codirectores existentes
    await queryRunner.query(`
      INSERT INTO "participacion_convocatoria" ("usuarioId", "convocatoriaId", "rol", "edicionId", "esDirectorPrincipal", "asignadoPorId")
      SELECT
        e."codirectorId",
        e."convocatoriaId",
        'DirectorDeProyecto',
        e."id",
        false,
        '00000000-0000-0000-0000-000000000000'
      FROM "edicion" e
      WHERE e."codirectorId" IS NOT NULL
    `);

    // 5. Eliminar columnas viejas de edicion
    await queryRunner.query(`
      ALTER TABLE "edicion" DROP CONSTRAINT IF EXISTS "FK_edicion_director"
    `);

    await queryRunner.query(`
      ALTER TABLE "edicion" DROP CONSTRAINT IF EXISTS "FK_edicion_codirector"
    `);

    await queryRunner.query(`
      ALTER TABLE "edicion" DROP COLUMN "directorId"
    `);

    await queryRunner.query(`
      ALTER TABLE "edicion" DROP COLUMN "codirectorId"
    `);

    // 6. Hacer creadoPorId NOT NULL después de migrar datos
    await queryRunner.query(`
      ALTER TABLE "edicion" ALTER COLUMN "creadoPorId" SET NOT NULL
    `);

    // 7. Migrar roles de usuarios: DirectorDeProyecto -> Docente, Evaluador -> Docente
    await queryRunner.query(`
      UPDATE "usuario"
      SET "roles" = REPLACE("roles", 'DirectorDeProyecto', 'Docente')
      WHERE "roles" LIKE '%DirectorDeProyecto%'
    `);

    await queryRunner.query(`
      UPDATE "usuario"
      SET "roles" = REPLACE("roles", 'Evaluador', 'Docente')
      WHERE "roles" LIKE '%Evaluador%'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios de roles
    await queryRunner.query(`
      UPDATE "usuario"
      SET "roles" = REPLACE("roles", 'Docente', 'DirectorDeProyecto')
      WHERE "roles" LIKE '%Docente%'
    `);

    // Revertir columnas de edicion
    await queryRunner.query(`
      ALTER TABLE "edicion" ADD COLUMN "codirectorId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "edicion" ADD COLUMN "directorId" uuid
    `);

    // Revertir creadoPorId
    await queryRunner.query(`
      ALTER TABLE "edicion" DROP CONSTRAINT IF EXISTS "FK_edicion_creado_por"
    `);
    await queryRunner.query(`
      ALTER TABLE "edicion" DROP COLUMN "creadoPorId"
    `);

    // Eliminar tabla participacion_convocatoria
    await queryRunner.query(`DROP TABLE "participacion_convocatoria"`);

    // Renombrar columna
    await queryRunner.query(`
      ALTER TABLE "usuario"
      RENAME COLUMN "estadoValidacionDocente" TO "estadoDirector"
    `);
  }
}
