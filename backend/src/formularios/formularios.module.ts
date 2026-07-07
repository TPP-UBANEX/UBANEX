import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formulario } from './formulario.entity';
import { FormulariosController } from './formularios.controller';
import { FormulariosService } from './formularios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Formulario])],
  controllers: [FormulariosController],
  providers: [FormulariosService],
})
export class FormulariosModule {}
