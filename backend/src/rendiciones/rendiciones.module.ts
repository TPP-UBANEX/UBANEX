import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RendicionesController } from './rendiciones.controller';
import { RendicionesService } from './rendiciones.service';
import { Rendicion } from './rendicion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rendicion])],
  controllers: [RendicionesController],
  providers: [RendicionesService],
})
export class RendicionesModule {}
