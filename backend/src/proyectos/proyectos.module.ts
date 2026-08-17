import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './proyecto.entity';
import { Edicion } from './edicion.entity';
import { Formulario } from '../formularios/formulario.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { ParticipacionesConvocatoriaModule } from '../participaciones-convocatoria/participaciones-convocatoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyecto, Edicion, Formulario, Emparejamiento]),
    ParticipacionesConvocatoriaModule,
  ],
  controllers: [ProyectosController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}
