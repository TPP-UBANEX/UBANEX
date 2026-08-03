import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { EstadoValidacionDocente } from '../enums/estado-validacion-docente.enum';

@Injectable()
export class MailService {
  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!apiKey) throw new Error('SENDGRID_API_KEY no configurada');
    sgMail.setApiKey(apiKey);
  }

  async enviarPasswordTemporal(destino: string, nombre: string, password: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || 'UBANEX <noreplyubanex@gmail.com>';
    await sgMail.send({
      from,
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

  async enviarEstadoValidacionDocente(destino: string, nombre: string, estado: EstadoValidacionDocente): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || 'UBANEX <noreplyubanex@gmail.com>';
    const aprobado = estado === EstadoValidacionDocente.Validado;
    const subject = aprobado
      ? 'UBANEX — Tu cuenta de docente fue validada'
      : 'UBANEX — Tu cuenta de docente fue rechazada';
    const mensaje = aprobado
      ? 'Tu cuenta como docente fue validada. Ya podés iniciar sesión y utilizar el sistema.'
      : 'Tu cuenta como docente fue rechazada. Si creés que se trata de un error, comunicate con la secretaría de tu unidad académica.';

    await sgMail.send({
      from,
      to: destino,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">UBANEX</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>${mensaje}</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7;" />
          <p style="color: #999; font-size: 12px;">Sistema de Gestión UBANEX</p>
        </div>
      `,
    });
  }

  async enviarPropuestaEvaluador(
    destino: string,
    docenteNombre: string,
    convocatoriaNombre: string,
  ): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || 'UBANEX <noreplyubanex@gmail.com>';
    await sgMail.send({
      from,
      to: destino,
      subject: 'UBANEX — Fuiste propuesto como evaluador',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">UBANEX</h2>
          <p>Hola <strong>${docenteNombre}</strong>,</p>
          <p>
            Tu Unidad Académica te propuso como <strong>evaluador</strong> en la convocatoria
            <strong>${convocatoriaNombre}</strong>.
          </p>
          <p>Ingrsa a UBANEX para Aceptar o  Rechazar la propuesta</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7;" />
          <p style="color: #999; font-size: 12px;">Sistema de Gestión UBANEX</p>
        </div>
      `,
    });
  }

  async enviarEstadoEvaluador(
    destinos: string[],
    secretariaNombre: string,
    docenteNombre: string,
    convocatoriaNombre: string,
    aprobado: boolean,
  ): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || 'UBANEX <noreplyubanex@gmail.com>';
    const estadoTexto = aprobado ? 'aprobado' : 'rechazado';
    const subject = `UBANEX — Propuesta de evaluador ${estadoTexto}`;
    await sgMail.send({
      from,
      to: destinos,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">UBANEX</h2>
          <p>Hola <strong>${secretariaNombre}</strong>,</p>
          <p>
            La propuesta del evaluador <strong>${docenteNombre}</strong> en la convocatoria
            <strong>${convocatoriaNombre}</strong> fue <strong>${estadoTexto}</strong> por la Dirección de Rectorado.
          </p>
          ${aprobado
            ? '<p>El docente ya puede cumplir funciones de evaluador en la convocatoria.</p>'
            : '<p>Si el cupo lo permite, podés proponer un reemplazo.</p>'}
          <hr style="border: none; border-top: 1px solid #e4e4e7;" />
          <p style="color: #999; font-size: 12px;">Sistema de Gestión UBANEX</p>
        </div>
      `,
    });
  }

  async enviarRespuestaDocente(
    destinos: string[],
    secretariaNombre: string,
    docenteNombre: string,
    convocatoriaNombre: string,
    aceptada: boolean,
  ): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || 'UBANEX <noreplyubanex@gmail.com>';
    const respuestaTexto = aceptada ? 'aceptó' : 'declinó';
    const subject = `UBANEX — Docente ${respuestaTexto} la propuesta como evaluador`;
    await sgMail.send({
      from,
      to: destinos,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">UBANEX</h2>
          <p>Hola <strong>${secretariaNombre}</strong>,</p>
          <p>
            El docente <strong>${docenteNombre}</strong> ${respuestaTexto} la propuesta como
            <strong>evaluador</strong> en la convocatoria <strong>${convocatoriaNombre}</strong>.
          </p>
          ${aceptada
            ? '<p>La propuesta queda a la espera de la decisión de la Dirección de Rectorado.</p>'
            : '<p>Si el cupo lo permite, podés proponer otro evaluador en su reemplazo.</p>'}
          <hr style="border: none; border-top: 1px solid #e4e4e7;" />
          <p style="color: #999; font-size: 12px;">Sistema de Gestión UBANEX</p>
        </div>
      `,
    });
  }

  async enviarResultadoPropuestaEvaluador(
    destino: string,
    docenteNombre: string,
    convocatoriaNombre: string,
    aprobado: boolean,
  ): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || 'UBANEX <noreplyubanex@gmail.com>';
    const estadoTexto = aprobado ? 'aprobada' : 'rechazada';
    const mensaje = aprobado
      ? 'Tu propuesta fue aprobada por la Dirección de Rectorado. Ya podés cumplir funciones de evaluador en la convocatoria.'
      : 'Tu propuesta fue rechazada por la Dirección de Rectorado. Si creés que se trata de un error, comunicate con la secretaría de tu unidad académica.';
    await sgMail.send({
      from,
      to: destino,
      subject: `UBANEX — Tu propuesta como evaluador fue ${estadoTexto}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">UBANEX</h2>
          <p>Hola <strong>${docenteNombre}</strong>,</p>
          <p>
            Tu propuesta como <strong>evaluador</strong> en la convocatoria
            <strong>${convocatoriaNombre}</strong> fue ${estadoTexto}.
          </p>
          <p>${mensaje}</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7;" />
          <p style="color: #999; font-size: 12px;">Sistema de Gestión UBANEX</p>
        </div>
      `,
    });
  }
}
