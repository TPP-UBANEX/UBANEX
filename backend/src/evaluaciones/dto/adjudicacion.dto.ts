import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Mismo límite que el aval por edición (ActualizarAvalDto).
export const RESOLUCION_URL_MAX_LENGTH = 2048;

// El monto adjudicado NO se edita: sale de la fórmula
// presupuesto a adjudicar = solicitado + extra insumos + extra PSE
// (ver proyectos/presupuesto.util.ts#calcularPresupuestoAAdjudicar) y es fijo
// para toda la convocatoria. Estos DTOs solo llevan la resolución en sí.

export class GuardarAdjudicacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(RESOLUCION_URL_MAX_LENGTH)
  resolucionUrl?: string | null;

  @IsOptional()
  @IsDateString()
  fechaResolucion?: string;
}

export class EmitirAdjudicacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(RESOLUCION_URL_MAX_LENGTH)
  resolucionUrl: string;

  @IsDateString()
  fechaResolucion: string;
}
