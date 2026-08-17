import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConvocatoriasModule } from './convocatorias/convocatorias.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { RendicionesModule } from './rendiciones/rendiciones.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { UnidadesAcademicasModule } from './unidades-academicas/unidades-academicas.module';
import { CarrerasModule } from './carreras/carreras.module';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { FormulariosModule } from './formularios/formularios.module';
import { ParticipacionesConvocatoriaModule } from './participaciones-convocatoria/participaciones-convocatoria.module';
import { SugerenciasModule } from './sugerencias/sugerencias.module';
import { GeoModule } from './geo/geo.module';
import { TemplatesEvaluacionModule } from './templates-evaluacion/templates-evaluacion.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // synchronize compara el schema con la base en cada arranque (~9s) y se
        // usa solo en desarrollo (Docker/local). En Render (RENDER=true) se
        // desactiva: el schema ya existe y el boot debe ser rápido y estable.
        // Los cambios de schema en producción se aplican con migraciones
        // (ver ormconfig.ts).
        synchronize: process.env.RENDER !== 'true',
      }),
    }),
    ConvocatoriasModule,
    ProyectosModule,
    EvaluacionesModule,
    RendicionesModule,
    UsuariosModule,
    UnidadesAcademicasModule,
    CarrerasModule,
    AuthModule,
    AuditoriaModule,
    FormulariosModule,
    ParticipacionesConvocatoriaModule,
    SugerenciasModule,
    GeoModule,
    TemplatesEvaluacionModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
