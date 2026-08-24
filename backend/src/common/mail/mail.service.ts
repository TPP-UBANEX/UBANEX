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
      subject: `UBANEX — Fuiste propuesto como evaluador en "${convocatoriaNombre}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
          <div style="background: #1a1a2e; padding: 24px 20px; text-align: center;">
            <div style="font-size: 22px; font-weight: bold; color: #ffffff;">UBANEX</div>
            <div style="color: #b8b8cc; font-size: 13px; margin-top: 4px;">
              Propuesta de evaluador · <strong>${convocatoriaNombre}</strong>
            </div>
          </div>
          <div style="padding: 24px 20px; background: #ffffff;">
            <p style="margin: 0 0 12px;">Hola <strong>${docenteNombre}</strong>,</p>
            <p style="margin: 0;">
              Tu Unidad Académica te propuso como <strong>evaluador</strong> en la convocatoria
              <strong>${convocatoriaNombre}</strong>.
            </p>
            <div style="margin-top: 16px; padding: 12px 16px; background: #f4f4f5; border-left: 4px solid #1a1a2e; border-radius: 4px; color: #444;">
              <p style="margin: 0;">Ingresá a UBANEX para <strong>Aceptar</strong> o <strong>Rechazar</strong> la propuesta.</p>
            </div>
          </div>
          <div style="padding: 12px 20px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 12px; color: #999;">
            Sistema de Gestión UBANEX
          </div>
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

  async enviarResultadoAdjudicacion(
    destino: string,
    nombre: string,
    convocatoriaNombre: string,
    proyectoNombre: string,
    adjudicado: boolean,
  ): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || 'UBANEX <noreplyubanex@gmail.com>';
    const estadoTexto = adjudicado ? 'fue adjudicado' : 'NO fue adjudicado';
    const subject = adjudicado
      ? `UBANEX — Tu proyecto fue adjudicado en "${convocatoriaNombre}"`
      : `UBANEX — Tu proyecto no fue adjudicado en "${convocatoriaNombre}"`;
    await sgMail.send({
      from,
      to: destino,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">UBANEX</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>
            Te informamos el resultado de la convocatoria
            <strong>${convocatoriaNombre}</strong> para tu proyecto
            <strong>${proyectoNombre}</strong>:
          </p>
          <div style="margin-top: 16px; padding: 12px 16px; background: #f4f4f5; border-left: 4px solid ${adjudicado ? '#16a34a' : '#dc2626'}; border-radius: 4px; color: #444;">
            <p style="margin: 0;"><strong>Tu proyecto ${estadoTexto}.</strong></p>
          </div>
          <hr style="border: none; border-top: 1px solid #e4e4e7;" />
          <p style="color: #999; font-size: 12px;">Sistema de Gestión UBANEX</p>
        </div>
      `,
    });
  }
}
