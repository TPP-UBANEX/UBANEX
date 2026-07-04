import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './usuario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MailModule } from '../common/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario]), AuditoriaModule, MailModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
