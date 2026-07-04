import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async enviarPasswordTemporal(destino: string, nombre: string, password: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: destino,
      subject: 'UBANEX — Nueva contraseña temporal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">UBANEX</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Se ha generado una nueva contraseña temporal para tu cuenta:</p>
          <div style="background: #f4f4f5; padding: 12px 16px; border-radius: 6px; text-align: center; font-size: 18px; letter-spacing: 2px; font-family: monospace;">
            ${password}
          </div>
          <p style="color: #666; font-size: 13px;">Te recomendamos cambiarla luego de iniciar sesión.</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7;" />
          <p style="color: #999; font-size: 12px;">Sistema de Gestión UBANEX</p>
        </div>
      `,
    });
  }
}
