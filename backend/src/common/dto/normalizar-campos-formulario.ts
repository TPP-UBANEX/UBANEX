import * as crypto from 'crypto';
import { CampoFormulario, ColumnaTabla } from '../../formularios/campo-formulario.interface';
import { TipoCampo } from '../enums/tipo-campo.enum';
import { CampoFormularioDto, ColumnaTablaDto } from './campo-formulario.dto';

function normalizarColumnaTabla(columna: ColumnaTablaDto): ColumnaTabla {
  return {
    id: columna.id || crypto.randomUUID(),
    tipo: columna.tipo,
    nombre: columna.nombre.trim(),
    esObligatorio: columna.esObligatorio,
    opciones: columna.opciones?.map((o) => o.trim()).filter(Boolean),
    ...(columna.tipo === TipoCampo.Numero
      ? { minimo: columna.minimo, maximo: columna.maximo, admiteDecimales: columna.admiteDecimales }
      : {}),
    ...(columna.tipo === TipoCampo.Usuario
      ? { rolesUsuario: [...new Set(columna.rolesUsuario ?? [])] }
      : {}),
  };
}

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
    ...(campo.tipo === TipoCampo.Tabla
      ? {
        columnas: campo.columnas?.map(normalizarColumnaTabla),
        filasMinimas: campo.filasMinimas,
        filasMaximas: campo.filasMaximas,
      }
      : {}),
    ...(campo.tipo === TipoCampo.Usuario
      ? { rolesUsuario: [...new Set(campo.rolesUsuario ?? [])] }
      : {}),
  }));
}
