import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConvocatoriasController } from './convocatorias.controller';
import { ConvocatoriasService } from './convocatorias.service';
import { Convocatoria } from './convocatoria.entity';
import { Formulario } from '../formularios/formulario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Convocatoria, Formulario])],
  controllers: [ConvocatoriasController],
  providers: [ConvocatoriasService],
})
export class ConvocatoriasModule {}
