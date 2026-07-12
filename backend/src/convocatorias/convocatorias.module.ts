import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConvocatoriasController } from './convocatorias.controller';
import { ConvocatoriasService } from './convocatorias.service';
import { Convocatoria } from './convocatoria.entity';
import { Emparejamiento } from './emparejamiento.entity';
import { Formulario } from '../formularios/formulario.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Convocatoria, Emparejamiento, Formulario, UnidadAcademica])],
  controllers: [ConvocatoriasController],
  providers: [ConvocatoriasService],
  exports: [ConvocatoriasService],
})
export class ConvocatoriasModule {}
