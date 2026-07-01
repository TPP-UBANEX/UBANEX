import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadesAcademicasController } from './unidades-academicas.controller';
import { UnidadesAcademicasService } from './unidades-academicas.service';
import { UnidadAcademica } from './unidad-academica.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UnidadAcademica])],
  controllers: [UnidadesAcademicasController],
  providers: [UnidadesAcademicasService],
  exports: [UnidadesAcademicasService],
})
export class UnidadesAcademicasModule {}
