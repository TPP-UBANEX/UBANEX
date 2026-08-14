export enum RolUsuario {
  AutoridadDeRectorado = 'AutoridadDeRectorado',
  AsistenteDeRectorado = 'AsistenteDeRectorado',
  AutoridadDeSecretaria = 'AutoridadDeSecretaria',
  AsistenteDeSecretaria = 'AsistenteDeSecretaria',
  Estudiante = 'Estudiante',
  Docente = 'Docente',
}

/** Roles que puede buscar un campo de formulario de tipo usuario. */
export const ROLES_USUARIO_BUSCABLES: RolUsuario[] = [RolUsuario.Docente, RolUsuario.Estudiante];
