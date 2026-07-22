import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipacionConvocatoria } from './participacion-convocatoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParticipacionConvocatoria])],
})
export class ParticipacionesConvocatoriaModule {}
