import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formulario } from './formulario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { FormulariosController } from './formularios.controller';
import { FormulariosService } from './formularios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Formulario, Convocatoria])],
  controllers: [FormulariosController],
  providers: [FormulariosService],
})
export class FormulariosModule {}
