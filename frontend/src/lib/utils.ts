import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TELEFONO_REGEX = /^\+?[0-9()\-\s]{6,20}$/

export function esTelefonoValido(valor: string): boolean {
  return TELEFONO_REGEX.test(valor)
}

/** Antepone https:// si el link no trae protocolo, para que no se resuelva como ruta relativa. */
export function conProtocolo(url: string): string {
  const u = url.trim()
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

const DOMINIOS_GOOGLE_DRIVE = ['drive.google.com', 'drive.usercontent.google.com', 'docs.google.com']

/** Devuelve true si el link es de algún dominio de Google Drive (tras normalizar protocolo). */
export function esGoogleDrive(url: string): boolean {
  const v = url.trim()
  if (!v) return false
  let host: string
  try {
    host = new URL(conProtocolo(v)).hostname.toLowerCase()
  } catch {
    return false
  }
  return DOMINIOS_GOOGLE_DRIVE.some(d => host === d || host.endsWith(`.${d}`))
}
  /** Pasa una fecha ISO (AAAA-MM-DD) a dd/mm/aaaa sin usar Date, que la interpretaria como UTC y correria el dia. */
export function formatearFechaISO(valor: string): string {
  const [anio, mes, dia] = valor.split('-')
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : valor
}
