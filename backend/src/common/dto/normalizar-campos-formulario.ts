import * as crypto from 'crypto';
import { CampoFormulario } from '../../formularios/campo-formulario.interface';
import { TipoCampo } from '../enums/tipo-campo.enum';
import { CampoFormularioDto } from './campo-formulario.dto';

/**
 * Deja los campos listos para persistir: completa los ids faltantes, limpia los textos,
 * recalcula el orden por posición y descarta la configuración que no aplica al tipo.
 */
export function normalizarCamposFormulario(
  campos: CampoFormularioDto[],
): CampoFormulario[] {
  return campos.map((campo, index) => ({
    id: campo.id || crypto.randomUUID(),
    tipo: campo.tipo,
    nombre: campo.nombre.trim(),
    textoAyuda: campo.textoAyuda?.trim() || undefined,
    esObligatorio: campo.tipo === TipoCampo.Seccion ? false : campo.esObligatorio,
    orden: index,
    opciones: campo.opciones?.map((o) => o.trim()).filter(Boolean),
    ...(campo.tipo === TipoCampo.Numero
      ? { minimo: campo.minimo, maximo: campo.maximo, admiteDecimales: campo.admiteDecimales }
      : {}),
  }));
}
