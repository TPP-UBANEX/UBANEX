import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Convocatoria } from '@/data/types';
import { EstadoConvocatoria, estadoConvocatoriaLabel } from '@/data/types';
import { cn, formatearFechaISO } from '@/lib/utils';

type CampoFecha = 'fechaInicioPresentacion' | 'fechaFinPresentacion'
  | 'fechaInicioEvaluacion' | 'fechaFinEvaluacion'
  | 'fechaInicioEjecucion' | 'fechaFinEjecucion';

interface Etapa {
  estado: EstadoConvocatoria;
  inicio?: CampoFecha;
  fin?: CampoFecha;
}

// Las 5 etapas de EstadoConvocatoria, en orden, con los campos de fecha de las
// que tienen cronograma propio (Presentación, Evaluación, Ejecución).
const ETAPAS: Etapa[] = [
  { estado: EstadoConvocatoria.Configuracion },
  { estado: EstadoConvocatoria.Presentacion, inicio: 'fechaInicioPresentacion', fin: 'fechaFinPresentacion' },
  { estado: EstadoConvocatoria.Evaluacion, inicio: 'fechaInicioEvaluacion', fin: 'fechaFinEvaluacion' },
  { estado: EstadoConvocatoria.Ejecucion, inicio: 'fechaInicioEjecucion', fin: 'fechaFinEjecucion' },
  { estado: EstadoConvocatoria.Cierre },
];

interface Props {
  convocatoria: Convocatoria;
}

export function LineaTiempoConvocatoria({ convocatoria }: Props) {
  const indiceActual = ETAPAS.findIndex((e) => e.estado === convocatoria.estado);
  const etapaActual = ETAPAS[indiceActual];

  // Fecha de hoy en formato AAAA-MM-DD (hora local), comparable como string con las
  // fechas ISO del backend sin pasar por Date/UTC.
  const hoyISO = new Date().toLocaleDateString('sv-SE');

  let avisoDesfasaje: string | null = null;
  if (etapaActual?.inicio && etapaActual.fin) {
    const inicio = convocatoria[etapaActual.inicio] as string | null | undefined;
    const fin = convocatoria[etapaActual.fin] as string | null | undefined;
    if (fin && hoyISO > fin) {
      avisoDesfasaje = `La etapa venció el ${formatearFechaISO(fin)}`;
    } else if (inicio && hoyISO < inicio) {
      avisoDesfasaje = `La etapa comienza el ${formatearFechaISO(inicio)}`;
    }
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Etapa actual</p>
          {avisoDesfasaje && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              {avisoDesfasaje}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {ETAPAS.map((etapa, i) => {
            const segmento = (
              <div
                className={cn(
                  'h-2.5 flex-1 rounded-full transition-colors',
                  i < indiceActual && 'bg-primary/40',
                  i === indiceActual && 'bg-primary ring-2 ring-primary/30',
                  i > indiceActual && 'bg-muted',
                )}
              />
            );
            if (!etapa.inicio || !etapa.fin) {
              return <div key={etapa.estado} className="flex-1">{segmento}</div>;
            }
            const inicio = convocatoria[etapa.inicio] as string | null | undefined;
            const fin = convocatoria[etapa.fin] as string | null | undefined;
            return (
              <Tooltip key={etapa.estado}>
                <TooltipTrigger asChild>
                  <button type="button" className="flex-1 focus:outline-none">
                    {segmento}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{estadoConvocatoriaLabel[etapa.estado]}</p>
                  <p>Inicio: {inicio ? formatearFechaISO(inicio) : '-'}</p>
                  <p>Fin: {fin ? formatearFechaISO(fin) : '-'}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex gap-1 mt-1.5">
          {ETAPAS.map((etapa, i) => (
            <div
              key={etapa.estado}
              className={cn(
                'flex-1 text-center text-[10px] sm:text-xs truncate',
                i === indiceActual ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {estadoConvocatoriaLabel[etapa.estado]}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
