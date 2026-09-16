import { BadRequestException } from '@nestjs/common';

const DOMINIOS_GOOGLE_DRIVE = [
  'drive.google.com',
  'drive.usercontent.google.com',
  'docs.google.com',
];

/** Antepone https:// si el link no trae protocolo. */
export function normalizarConProtocolo(url: string): string {
  const v = url.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/**
 * Verifica que el link (una vez normalizado con protocolo https) apunte a un
 * dominio de Google Drive. Devuelve true/false sin lanzar.
 */
export function esLinkGoogleDrive(url: string): boolean {
  const v = url.trim();
  if (!v) return false;
  let host: string;
  try {
    host = new URL(normalizarConProtocolo(v)).hostname.toLowerCase();
  } catch {
    return false;
  }
  return DOMINIOS_GOOGLE_DRIVE.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Normaliza y valida un link de Google Drive. Devuelve el link normalizado
 * (con https://) o lanza BadRequestException. `etiquetaCampo` se usa en los
 * mensajes de error (ej. "El link al comprobante ...", "El link al CV ...").
 */
export function validarLinkGoogleDrive(url: string, etiquetaCampo = 'link'): string {
  const v = url.trim();
  if (!v) {
    throw new BadRequestException(`El ${etiquetaCampo} es obligatorio`);
  }
  if (!esLinkGoogleDrive(v)) {
    let host: string;
    try {
      host = new URL(normalizarConProtocolo(v)).hostname.toLowerCase();
    } catch {
      throw new BadRequestException(`El ${etiquetaCampo} no es una URL válida`);
    }
    void host;
    throw new BadRequestException(
      `El ${etiquetaCampo} debe ser de Google Drive (drive.google.com, docs.google.com o drive.usercontent.google.com)`,
    );
  }
  return normalizarConProtocolo(v);
}
