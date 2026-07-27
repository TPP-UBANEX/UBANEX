import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SugerenciaCambio } from './sugerencia-cambio.entity';
import { Notificacion } from './notificacion.entity';
import { ProyectosModule } from '../proyectos/proyectos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SugerenciaCambio, Notificacion]),
    ProyectosModule,
  ],
})
export class SugerenciasModule {}
