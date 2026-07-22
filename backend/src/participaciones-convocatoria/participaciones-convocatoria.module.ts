import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipacionConvocatoria } from './participacion-convocatoria.entity';
import { ParticipacionConvocatoriaService } from './participacion-convocatoria.service';
import { ParticipacionConvocatoriaController } from './participacion-convocatoria.controller';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParticipacionConvocatoria, Usuario, Convocatoria, Edicion]),
  ],
  providers: [ParticipacionConvocatoriaService],
  controllers: [ParticipacionConvocatoriaController],
})
export class ParticipacionesConvocatoriaModule {}
