export enum TipoCampo {
  Texto = 'texto',
  TextoLargo = 'texto_largo',
  Numero = 'numero',
  Fecha = 'fecha',
  Geolocalizacion = 'geolocalizacion',
  Booleano = 'booleano',
  Checkbox = 'checkbox',
  Select = 'select',
  Archivo = 'archivo',
  Seccion = 'seccion',
}

export const MAX_LONGITUD_POR_TIPO: Partial<Record<TipoCampo, number>> = {
  [TipoCampo.Texto]: 255,
  [TipoCampo.TextoLargo]: 10000,
};
