import { TipoCampo } from '../common/enums/tipo-campo.enum';

export interface CampoFormulario {
  id: string;
  tipo: TipoCampo;
  nombre: string;
  textoAyuda?: string;
  esObligatorio: boolean;
  orden: number;
  opciones?: string[];
}
