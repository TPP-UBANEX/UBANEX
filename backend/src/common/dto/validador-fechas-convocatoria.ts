import { BadRequestException } from '@nestjs/common';

export function validarFechasConvocatoria(campos: {
  fechaInicioPresentacion?: string | null;
  fechaFinPresentacion?: string | null;
  fechaInicioEvaluacion?: string | null;
  fechaFinEvaluacion?: string | null;
  fechaInicioEjecucion?: string | null;
  fechaFinEjecucion?: string | null;
}): void {
  const vals = [
    campos.fechaInicioPresentacion,
    campos.fechaFinPresentacion,
    campos.fechaInicioEvaluacion,
    campos.fechaFinEvaluacion,
    campos.fechaInicioEjecucion,
    campos.fechaFinEjecucion,
  ];

  if (vals.every((v) => !v)) return;

  const p = (s?: string | null) => (s ? new Date(s) : null);
  const ip = p(campos.fechaInicioPresentacion);
  const fp = p(campos.fechaFinPresentacion);
  const ie = p(campos.fechaInicioEvaluacion);
  const fe = p(campos.fechaFinEvaluacion);
  const iej = p(campos.fechaInicioEjecucion);
  const fej = p(campos.fechaFinEjecucion);

  if (ip && fp && ip > fp) {
    throw new BadRequestException('El fin debe ser igual o posterior al inicio');
  }
  if (ie && fe && ie > fe) {
    throw new BadRequestException('Inicio Evaluación debe ser anterior o igual a Fin Evaluación');
  }
  if (iej && fej && iej > fej) {
    throw new BadRequestException('El fin debe ser igual o posterior al inicio');
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (ip && ip < hoy) {
    throw new BadRequestException('La fecha de inicio no puede ser anterior a hoy');
  }
  if (fp && fp < hoy) {
    throw new BadRequestException('La fecha de fin no puede ser anterior a hoy');
  }
  if (ie && ie < hoy) {
    throw new BadRequestException('La fecha de inicio no puede ser anterior a hoy');
  }
  if (fe && fe < hoy) {
    throw new BadRequestException('La fecha de fin no puede ser anterior a hoy');
  }
  if (iej && iej < hoy) {
    throw new BadRequestException('La fecha de inicio no puede ser anterior a hoy');
  }
  if (fej && fej < hoy) {
    throw new BadRequestException('La fecha de fin no puede ser anterior a hoy');
  }

  if (fp && ie && fp >= ie) {
    throw new BadRequestException('Fin Presentación debe ser anterior a Inicio Evaluación');
  }
  if (fe && iej && fe >= iej) {
    throw new BadRequestException('Fin Evaluación debe ser anterior a Inicio Ejecución');
  }
}
