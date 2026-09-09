import { RolUsuario } from '@/data/types'
import type { Usuario } from '@/data/types'

export const esSecretaria = (u: Usuario | null) =>
  u?.roles.some(
    (r) => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
  ) ?? false

export const esAutoridadSecretaria = (u: Usuario | null) =>
  u?.roles.includes(RolUsuario.AutoridadDeSecretaria) ?? false

export const esRectorado = (u: Usuario | null) =>
  u?.roles.some(
    (r) => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
  ) ?? false
