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
