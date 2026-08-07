import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipacionConvocatoria } from './participacion-convocatoria.entity';
import { ParticipacionConvocatoriaService } from './participacion-convocatoria.service';
import { ParticipacionConvocatoriaController } from './participacion-convocatoria.controller';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MailModule } from '../common/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParticipacionConvocatoria, Usuario, Convocatoria, Edicion, Notificacion]),
    AuditoriaModule,
    MailModule,
  ],
  providers: [ParticipacionConvocatoriaService],
  controllers: [ParticipacionConvocatoriaController],
  exports: [TypeOrmModule],
})
export class ParticipacionesConvocatoriaModule {}
