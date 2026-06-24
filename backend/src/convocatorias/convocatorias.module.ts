import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConvocatoriasController } from './convocatorias.controller';
import { ConvocatoriasService } from './convocatorias.service';
import { Convocatoria } from './convocatoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Convocatoria])],
  controllers: [ConvocatoriasController],
  providers: [ConvocatoriasService],
})
export class ConvocatoriasModule {}
