import { TipoCampo } from '../common/enums/tipo-campo.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

export interface ColumnaTabla {
  id: string;
  tipo: TipoCampo;
  nombre: string;
  esObligatorio: boolean;
  opciones?: string[];
  minimo?: number;
  maximo?: number;
  admiteDecimales?: boolean;
  rolesUsuario?: RolUsuario[];
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
  rolesUsuario?: RolUsuario[];
}
