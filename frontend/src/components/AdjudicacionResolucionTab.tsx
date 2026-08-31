import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatearMoneda } from '@/lib/presupuesto';
import type { AdjudicacionResumen } from '@/data/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  convocatoriaId: string;
  // Solo la Autoridad de Rectorado puede emitir; el Asistente puede editar el borrador.
  puedeEmitir: boolean;
  // Se dispara al emitir la resolución, para que el resto de la página refresque.
  onEmitida: () => void;
}

export function AdjudicacionResolucionTab({ convocatoriaId, puedeEmitir, onEmitida }: Props) {
  const [data, setData] = useState<AdjudicacionResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);

  const [resolucionUrl, setResolucionUrl] = useState('');
  const [fechaResolucion, setFechaResolucion] = useState('');
  const [montos, setMontos] = useState<Record<string, string>>({});

  const cargar = useCallback(() => {
    setLoading(true);
    api.evaluaciones.adjudicacion
      .obtener(convocatoriaId)
      .then((res) => {
        setData(res);
        setResolucionUrl(res.convocatoria.resolucionUrl ?? '');
        setFechaResolucion(res.convocatoria.fechaResolucion ?? '');
        const iniciales: Record<string, string> = {};
        for (const item of res.items) {
          if (item.adjudicacionPropuesta !== true) continue;
          const valor = item.montoAdjudicado ?? item.presupuestoAAdjudicar;
          iniciales[item.edicionId] = valor != null ? String(valor) : '';
        }
        setMontos(iniciales);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Error al cargar la adjudicación');
      })
      .finally(() => setLoading(false));
  }, [convocatoriaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const adjudicadas = useMemo(
    () => (data?.items ?? []).filter((i) => i.adjudicacionPropuesta === true),
    [data],
  );
  const emitida = data?.convocatoria.adjudicacionEmitida === true;
  const totalAdjudicado = adjudicadas.reduce(
    (s, i) => s + (Number(montos[i.edicionId]) || i.montoAdjudicado || 0),
    0,
  );
  const faltanAval = adjudicadas.filter((i) => !i.tieneAval);

  const payloadMontos = () =>
    adjudicadas
      .map((i) => ({ edicionId: i.edicionId, monto: Number(montos[i.edicionId]) }))
      .filter((m) => !Number.isNaN(m.monto));

  const guardarBorrador = async () => {
    try {
      setGuardando(true);
      await api.evaluaciones.adjudicacion.guardarBorrador(convocatoriaId, {
        resolucionUrl: resolucionUrl.trim() || null,
        fechaResolucion: fechaResolucion || undefined,
        montos: payloadMontos(),
      });
      toast.success('Borrador de la resolución guardado');
      cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el borrador');
    } finally {
      setGuardando(false);
    }
  };

  const emitir = async () => {
    try {
      setEmitiendo(true);
      await api.evaluaciones.adjudicacion.emitir(convocatoriaId, {
        resolucionUrl: resolucionUrl.trim(),
        fechaResolucion,
        montos: payloadMontos(),
      });
      toast.success('Resolución de adjudicación emitida');
      setConfirmarOpen(false);
      onEmitida();
      cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo emitir la resolución');
    } finally {
      setEmitiendo(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Resolución de adjudicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.convocatoria.ordenMeritoConfirmado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Resolución de adjudicación</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Confirmá el orden de mérito para poder emitir la resolución de adjudicación.
        </CardContent>
      </Card>
    );
  }

  const emisionHabilitada =
    puedeEmitir &&
    !emitida &&
    resolucionUrl.trim().length > 0 &&
    fechaResolucion.length > 0 &&
    adjudicadas.length > 0 &&
    faltanAval.length === 0 &&
    adjudicadas.every((i) => Number(montos[i.edicionId]) > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Resolución de adjudicación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {emitida ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div>
              Resolución emitida
              {data.convocatoria.fechaResolucion ? ` el ${data.convocatoria.fechaResolucion}` : ''}.
              Solo puede consultarse.
            </div>
            {data.convocatoria.resolucionUrl && (
              <a
                href={data.convocatoria.resolucionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Ver resolución
              </a>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">URL de la resolución</label>
              <Input
                placeholder="https://..."
                value={resolucionUrl}
                onChange={(e) => setResolucionUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Fecha de resolución</label>
              <Input
                type="date"
                value={fechaResolucion}
                onChange={(e) => setFechaResolucion(e.target.value)}
              />
            </div>
          </div>
        )}

        {!emitida && faltanAval.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Falta el aval del decano en:{' '}
            {faltanAval.map((i) => i.proyectoNombre ?? i.edicionId).join(', ')}.
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Unidad académica</TableHead>
                <TableHead>Aval</TableHead>
                <TableHead className="text-right">A adjudicar</TableHead>
                <TableHead className="text-right">Monto adjudicado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjudicadas.map((i) => (
                <TableRow key={i.edicionId}>
                  <TableCell className="text-muted-foreground">{i.ordenMerito ?? '—'}</TableCell>
                  <TableCell className="font-medium">{i.proyectoNombre ?? 'Sin nombre'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {i.unidadAcademica?.nombre ?? '-'}
                  </TableCell>
                  <TableCell>
                    {i.tieneAval ? (
                      <span className="text-xs text-muted-foreground">Cargado</span>
                    ) : (
                      <span className="text-xs text-destructive">Falta</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatearMoneda(i.presupuestoAAdjudicar)}
                  </TableCell>
                  <TableCell className="text-right">
                    {emitida ? (
                      formatearMoneda(i.montoAdjudicado)
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-40 ml-auto text-right"
                        value={montos[i.edicionId] ?? ''}
                        onChange={(e) =>
                          setMontos((prev) => ({ ...prev, [i.edicionId]: e.target.value }))
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {adjudicadas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No hay proyectos propuestos para adjudicación.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!emitida && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {adjudicadas.length} proyecto(s) · Total{' '}
              <span className="font-medium text-foreground">
                {formatearMoneda(totalAdjudicado)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={guardarBorrador} disabled={guardando || emitiendo}>
                {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar borrador
              </Button>
              {puedeEmitir && (
                <Button
                  onClick={() => setConfirmarOpen(true)}
                  disabled={!emisionHabilitada || emitiendo}
                >
                  Emitir adjudicación
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmarOpen} onOpenChange={setConfirmarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir resolución de adjudicación</DialogTitle>
            <DialogDescription>
              Se van a adjudicar {adjudicadas.length} proyecto(s) por un total de{' '}
              {formatearMoneda(totalAdjudicado)}. El resto de los proyectos evaluados pasan a «No
              adjudicado». Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarOpen(false)} disabled={emitiendo}>
              Cancelar
            </Button>
            <Button onClick={emitir} disabled={emitiendo}>
              {emitiendo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Emitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
