import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './proyecto.entity';
import { Edicion } from './edicion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proyecto, Edicion])],
  controllers: [ProyectosController],
  providers: [ProyectosService],
})
export class ProyectosModule {}
