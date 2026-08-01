import { CampoFormulario } from './campo-formulario.interface';
import { TipoCampo } from '../common/enums/tipo-campo.enum';

export function campoFormularioVacio(campo: CampoFormulario, valor: unknown): boolean {
  if (valor == null) return true;
  if (campo.tipo === TipoCampo.Checkbox) return !Array.isArray(valor) || valor.length === 0;
  if (typeof valor === 'string') return valor.trim() === '';
  return false;
}
