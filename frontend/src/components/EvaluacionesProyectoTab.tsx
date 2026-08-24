import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  EstadoEdicion,
  EstadoEvaluacion,
  TipoEvaluacionCruzada,
  estadoBadge,
  estadoConvocatoriaLabel,
} from '@/data/types';
import type { EvaluacionEdicionDetalle } from '@/data/types';

const tipoCruzadaLabel: Record<TipoEvaluacionCruzada, string> = {
  [TipoEvaluacionCruzada.Propia]: 'Propia',
  [TipoEvaluacionCruzada.Ajena]: 'Ajena',
  [TipoEvaluacionCruzada.TerceraUa]: 'Tercera UA',
};

const estadosSinEvaluacion = [
  EstadoEdicion.Borrador,
  EstadoEdicion.Presentado,
  EstadoEdicion.PendienteDeCambios,
];

function estadoEvaluacionLabel(estado: EstadoEvaluacion) {
  return estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador';
}

export function EvaluacionesProyectoTab({
  edicionId,
  estado,
}: {
  edicionId?: string;
  estado?: EstadoEdicion;
}) {
  const [data, setData] = useState<EvaluacionEdicionDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!edicionId) return;
    let activo = true;
    setLoading(true);
    setError(null);
    api.evaluaciones
      .edicion(edicionId)
      .then((d) => {
        if (activo) setData(d);
      })
      .catch((e) => {
        if (activo) setError(e instanceof Error ? e.message : 'Error al cargar las evaluaciones');
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [edicionId]);

  if (!edicionId) return null;

  if (estado && estadosSinEvaluacion.includes(estado)) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            El proyecto aún no está en etapa de evaluación.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const inst = data.institucional;
  const cruzadas = data.cruzadas;
  const sinEvaluaciones = !inst && cruzadas.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {data.convocatoria.nombre ?? 'Convocatoria'}
          {data.convocatoria.estado
            ? ` · ${estadoConvocatoriaLabel[data.convocatoria.estado] ?? data.convocatoria.estado}`
            : ''}
        </span>
      </div>

      {data.resumen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Resultado final</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Nota final</p>
              <p className="text-2xl font-bold">
                {data.resumen.notaFinal}
                <span className="text-sm font-medium text-muted-foreground">
                  / {data.resumen.puntajeInstitucionalMaximo + data.resumen.puntajeCruzadaMaximo}
                </span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Evaluación institucional</p>
              <p className="text-lg font-semibold">
                {data.resumen.puntajeInstitucional}
                <span className="text-sm font-medium text-muted-foreground">
                  {' '}
                  / {data.resumen.puntajeInstitucionalMaximo}
                </span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Evaluación cruzada (promedio)</p>
              <p className="text-lg font-semibold">
                {data.resumen.puntajeCruzadaPromedio != null
                  ? data.resumen.puntajeCruzadaPromedio
                  : '—'}
                <span className="text-sm font-medium text-muted-foreground">
                  {' '}
                  / {data.resumen.puntajeCruzadaMaximo}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {sinEvaluaciones ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-10">
              Aún no hay evaluaciones registradas para esta edición.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Evaluación institucional</CardTitle>
              {inst && (
                <Badge variant={estadoBadge[inst.estado] ?? 'outline'}>
                  {estadoEvaluacionLabel(inst.estado)}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!inst ? (
                <p className="text-sm text-muted-foreground">
                  Sin evaluación institucional registrada.
                </p>
              ) : (
                <>
                  {data.estructuraInstitucional && inst.categorias ? (
                    <div className="space-y-4">
                      {data.estructuraInstitucional.categorias.map((cat) => (
                        <div key={cat.id} className="space-y-3">
                          <h3 className="text-sm font-semibold border-b pb-1">{cat.nombre}</h3>
                          {cat.subcategorias.map((sub) => {
                            const resp = inst.categorias?.[sub.id];
                            return (
                              <div key={sub.id} className="space-y-1">
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-sm flex-1">{sub.texto}</p>
                                  <span className="text-sm font-medium shrink-0">
                                    {sub.tipoValor === 'numerico'
                                      ? ((resp?.valor as number | undefined) ?? '—')
                                      : resp?.valor === true
                                        ? 'Sí'
                                        : resp?.valor === false
                                          ? 'No'
                                          : '—'}
                                  </span>
                                </div>
                                {resp?.fundamentacion ? (
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                    {resp.fundamentacion}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {data.estructuraInstitucional.checklist.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold border-b pb-1">
                            Checklist institucional
                          </h3>
                          {data.estructuraInstitucional.checklist.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4">
                              <p className="text-sm flex-1">{item.texto}</p>
                              <span className="text-sm font-medium shrink-0">
                                {inst.checklist?.[item.id] === true
                                  ? 'Sí'
                                  : inst.checklist?.[item.id] === false
                                    ? 'No'
                                    : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {inst.observaciones ? (
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold border-b pb-1">Observaciones</h3>
                          <p className="text-sm whitespace-pre-wrap">{inst.observaciones}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      La evaluación aún está en borrador; el resultado se publicará al confirmarse.
                    </p>
                  )}
                  {(inst.realizadoPor || inst.confirmadoPor) && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {inst.realizadoPor && (
                        <p>Realizada por: {inst.realizadoPor.nombreCompleto}</p>
                      )}
                      {inst.confirmadoPor && (
                        <p>Confirmada por: {inst.confirmadoPor.nombreCompleto}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Evaluaciones cruzadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cruzadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin evaluaciones cruzadas registradas.
                </p>
              ) : (
                cruzadas.map((c) => (
                  <div key={c.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={estadoBadge[c.estado] ?? 'outline'}>
                          {estadoEvaluacionLabel(c.estado)}
                        </Badge>
                        <span className="text-sm font-medium">{tipoCruzadaLabel[c.tipo]}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {c.evaluador?.nombreCompleto ?? 'Sin evaluador'}
                      </span>
                    </div>
                    {c.items && data.estructuraCruzada ? (
                      <div className="space-y-2">
                        {data.estructuraCruzada.categorias.map((cat) => (
                          <div key={cat.id} className="space-y-1">
                            <p className="text-xs font-semibold">{cat.nombre}</p>
                            {cat.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 text-sm"
                              >
                                <span className="flex-1">{item.nombre}</span>
                                <span className="font-medium shrink-0">
                                  {c.items?.[item.id] ?? '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                        <div className="border-t pt-2 flex items-center justify-between">
                          <span className="text-sm font-medium">Puntaje total</span>
                          <span className="text-sm font-bold shrink-0">
                            {c.puntaje ?? '—'}
                            {c.puntajeMaximo != null ? ` / ${c.puntajeMaximo}` : ''}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        La evaluación aún está en borrador; el resultado se publicará al
                        confirmarse.
                      </p>
                    )}
                    {c.observaciones ? (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        Observaciones: {c.observaciones}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
