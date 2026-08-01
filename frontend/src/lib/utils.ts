import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TELEFONO_REGEX = /^\+?[0-9()\-\s]{6,20}$/

export function esTelefonoValido(valor: string): boolean {
  return TELEFONO_REGEX.test(valor)
}
