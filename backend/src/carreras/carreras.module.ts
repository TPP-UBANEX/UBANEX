import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarrerasController } from './carreras.controller';
import { CarrerasService } from './carreras.service';
import { Carrera } from './carrera.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Carrera, UnidadAcademica])],
  controllers: [CarrerasController],
  providers: [CarrerasService],
  exports: [CarrerasService],
})
export class CarrerasModule {}
