import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SugerenciaCambio } from './sugerencia-cambio.entity';
import { Notificacion } from './notificacion.entity';
import { SugerenciasController } from './sugerencias.controller';
import { SugerenciasService } from './sugerencias.service';
import { Edicion } from '../proyectos/edicion.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Rendicion } from '../rendiciones/rendicion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SugerenciaCambio, Notificacion, Edicion, Proyecto, ParticipacionConvocatoria, Convocatoria, Rendicion]),
  ],
  controllers: [SugerenciasController],
  providers: [SugerenciasService],
})
export class SugerenciasModule {}
