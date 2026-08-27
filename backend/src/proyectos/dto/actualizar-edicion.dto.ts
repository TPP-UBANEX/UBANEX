import {
  IsString, IsOptional, IsObject, IsInt, IsBoolean, IsUUID, ValidateIf,
} from 'class-validator';

export class ActualizarEdicionDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsInt()
  anioEdicion?: number;

  // Override manual del consolidado (solo Rectorado): true/false fuerzan, null vuelve a automático.
  @IsOptional()
  @ValidateIf((o) => o.esConsolidado !== null)
  @IsBoolean()
  esConsolidado?: boolean | null;

  @IsOptional()
  @IsBoolean()
  esInterfacultad?: boolean;

  @IsOptional()
  @IsUUID()
  unidadAcademicaAdicionalId?: string;

  @IsOptional()
  @IsObject()
  presupuesto?: object;

  @IsOptional()
  @IsObject()
  datosFormulario?: object;
}
