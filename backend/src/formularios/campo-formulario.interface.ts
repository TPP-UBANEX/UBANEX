import { TipoCampo } from '../common/enums/tipo-campo.enum';

export interface ColumnaTabla {
  id: string;
  tipo: TipoCampo;
  nombre: string;
  esObligatorio: boolean;
  opciones?: string[];
  minimo?: number;
  maximo?: number;
  admiteDecimales?: boolean;
}

export interface CampoFormulario {
  id: string;
  tipo: TipoCampo;
  nombre: string;
  textoAyuda?: string;
  esObligatorio: boolean;
  orden: number;
  opciones?: string[];
  minimo?: number;
  maximo?: number;
  admiteDecimales?: boolean;
  columnas?: ColumnaTabla[];
  filasMinimas?: number;
  filasMaximas?: number;
}
